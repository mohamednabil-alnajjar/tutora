/* الخطة الذكية: موادك وامتحاناتك، وجدول يومي بمذاكرة جديدة ومراجعات متباعدة */

import React, { useMemo, useState } from 'react';
import { Callout, Caption, ChoiceRow, FileButton, Group, TextField, useLocalState } from './kit';
import { t } from './i18n';
import {
    dayDiff, fmt, formatDate, fromISO, levelLabel, markStreak, toISO, todayISO,
    useActivity, useStreak, weekdayName,
} from './util';

export interface Subject { id: string; name: string; exam: string; level: 'سهلة' | 'متوسطة' | 'صعبة' }
export interface PlanTask { id: string; subject: string; kind: 'new' | 'review' | 'exam'; label: string }
export interface PlanDay { iso: string; tasks: PlanTask[] }

const REVIEW_OFFSETS: Record<Subject['level'], number[]> = {
    'سهلة': [2, 5],
    'متوسطة': [1, 3, 7],
    'صعبة': [1, 2, 4, 7],
};

export function buildPlan(subjects: Subject[]): PlanDay[] {
    const start = todayISO();
    const days: PlanDay[] = [];
    const byDate = new Map<string, PlanTask[]>();
    const add = (iso: string, task: PlanTask) => {
        const list = byDate.get(iso) ?? [];
        list.push(task);
        byDate.set(iso, list);
    };
    for (const s of subjects) {
        const exam = fromISO(s.exam);
        const gap = dayDiff(start, exam);
        if (gap < 0) continue;
        add(s.exam, { id: `${s.id}@${s.exam}:exam`, subject: s.name, kind: 'exam', label: 'يوم الامتحان' });
        if (gap === 0) continue;
        add(start, { id: `${s.id}@${start}:new`, subject: s.name, kind: 'new', label: gap <= 2 ? 'مذاكرة مكثفة' : 'مذاكرة جديدة' });
        if (gap <= 2) {
            for (let g = 1; g < gap; g++) {
                const iso = toISO(new Date(fromISO(start).getTime() + g * 86400000));
                add(iso, { id: `${s.id}@${iso}:rev`, subject: s.name, kind: 'review', label: 'مراجعة' });
            }
        } else {
            for (const off of REVIEW_OFFSETS[s.level]) {
                if (off < gap) {
                    const iso = toISO(new Date(fromISO(start).getTime() + off * 86400000));
                    add(iso, { id: `${s.id}@${iso}:rev`, subject: s.name, kind: 'review', label: 'مراجعة متباعدة' });
                }
            }
        }
    }
    const maxDays = 21;
    for (let g = 0; g < maxDays; g++) {
        const iso = toISO(new Date(fromISO(start).getTime() + g * 86400000));
        const tasks = byDate.get(iso);
        if (tasks && tasks.length > 0) days.push({ iso, tasks });
    }
    return days;
}

function kindText(task: PlanTask): string {
    if (task.kind === 'exam') return t('pl.examDay');
    if (task.label === 'مذاكرة مكثفة') return t('pl.intense');
    if (task.label === 'مذاكرة جديدة') return t('pl.newStudy');
    if (task.label === 'مراجعة متباعدة') return t('pl.reviewSpaced');
    return t('pl.review');
}

export function Planner() {
    const [subjects, setSubjects, savedSubjects] = useLocalState<Subject[]>('zakarely.planner.v2', []);
    const [streak, setStreak, streakSaved] = useStreak();
    const [done, setDone, savedDone] = useLocalState<Record<string, boolean>>('zakarely.done.v1', {});
    const [, pushActivity] = useActivity();
    const [name, setName] = useState('');
    const [exam, setExam] = useState('');
    const [level, setLevel] = useState<Subject['level']>('متوسطة');

    const plan = useMemo(() => buildPlan(subjects), [subjects]);
    const minDate = todayISO();
    const canAdd = name.trim().length > 0 && exam !== '' && dayDiff(minDate, fromISO(exam)) >= 0 && savedSubjects.ready;

    const addSubject = () => {
        if (!canAdd) return;
        setSubjects([...subjects, { id: `s${Date.now()}`, name: name.trim(), exam, level }]);
        setName('');
        setExam('');
        setLevel('متوسطة');
    };

    const removeSubject = (id: string) => {
        if (!savedSubjects.ready) return;
        setSubjects(subjects.filter(s => s.id !== id));
    };

    const toggleTask = (task: PlanTask) => {
        if (!savedDone.ready) return;
        if (!done[task.id]) {
            markStreak(streak, setStreak, streakSaved.ready);
            pushActivity(`✅ ${task.subject} — ${kindText(task)}`);
        }
        setDone({ ...done, [task.id]: !done[task.id] });
    };

    return <>
        <Group label={t('pl.label')} heading={t('pl.heading')}>
            <div className="zak-form">
                <TextField label={t('pl.name')} value={name} onChange={setName} />
                <div>
                    <span className="zak-field-label">{t('pl.exam')}</span>
                    <input type="date" dir="ltr" className="zak-date-input" value={exam} min={minDate} onChange={e => setExam(e.target.value)} />
                </div>
                <ChoiceRow
                    label={t('pl.level')}
                    options={[{ value: 'سهلة', label: t('pl.easy') }, { value: 'متوسطة', label: t('pl.mid') }, { value: 'صعبة', label: t('pl.hard') }]}
                    value={level}
                    onChange={v => setLevel(v as Subject['level'])}
                />
                <div className="zak-actions">
                    <FileButton disabled={!canAdd} onClick={addSubject}>{t('pl.add')}</FileButton>
                </div>
            </div>
            {subjects.length > 0 && <div className="zak-form">
                {subjects.map(s => (
                    <div key={s.id} className="zak-subject-row">
                        <span className="zak-subject-body">
                            <span className="zak-subject-name">{s.name}</span>
                            <span className="zak-subject-meta">{fmt('pl.examOn', { d: formatDate(s.exam) })} · {levelLabel(s.level)}</span>
                        </span>
                        <button type="button" className="zak-remove" aria-label={fmt('pl.remove', { n: s.name })} onClick={() => removeSubject(s.id)}>×</button>
                    </div>
                ))}
            </div>}
            {(savedSubjects.message || savedDone.message) && <Caption>{savedSubjects.message || savedDone.message}</Caption>}
        </Group>
        {subjects.length === 0 ? (
            <Callout title={t('pl.calloutT')} tone="note">{t('pl.calloutB')}</Callout>
        ) : (
            <Group label={t('pl.schedule')} heading={t('pl.days')}>
                {plan.length === 0 && <div className="zak-empty">{t('pl.empty')}</div>}
                {plan.map(day => (
                    <div key={day.iso} className="zak-day" data-today={day.iso === minDate}>
                        <div className="zak-day-head">
                            <span>{day.iso === minDate ? t('pl.today') : weekdayName(day.iso)}</span>
                            <span className="zak-day-date"><bdi>{formatDate(day.iso)}</bdi></span>
                        </div>
                        <div className="zak-tasks">
                            {day.tasks.map(task => (
                                <button key={task.id} type="button" className="zak-task" data-done={!!done[task.id]} onClick={() => toggleTask(task)}>
                                    <span className="zak-task-check">{done[task.id] ? '✓' : ''}</span>
                                    <span>
                                        <span className="zak-task-name">{task.subject}</span>
                                        <span className="zak-task-kind" data-kind={task.kind}>{kindText(task)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <Caption>{t('pl.note')}</Caption>
            </Group>
        )}
    </>;
}
