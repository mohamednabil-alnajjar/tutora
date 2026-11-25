/* اختبر نفسك: أسئلة في أي مادة بلا حدود + تحويل ملاحظاتك لأسئلة، وتشغيل الاختبار */

import React, { useEffect, useState } from 'react';
import { Caption, ChoiceRow, FileButton, Group, TextField } from './kit';
import { generateQuestions, generateTopicQuestions, speak, ttsSupported } from './ai';
import { fmt, letters, t } from './i18n';
import type { Unit } from './data/types';
import { consumePendingTopic, markStreak, shuffle, useActivity, useScores, useStreak } from './util';

export function QuizRun({ unit, onExit }: { unit: Unit; onExit: () => void }) {
    const [order] = useState(() => shuffle(unit.questions.map((_, i) => i)));
    const [idx, setIdx] = useState(0);
    const [chosen, setChosen] = useState<number | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [finished, setFinished] = useState(false);
    const [scores, setScores, saved] = useScores();
    const [streak, setStreak, streakSaved] = useStreak();
    const [, pushActivity] = useActivity();

    const total = order.length;
    const question = unit.questions[order[idx]];
    const pct = Math.round((correctCount / total) * 100);

    const choose = (i: number) => {
        if (chosen !== null) return;
        setChosen(i);
        if (i === question.answer) setCorrectCount(c => c + 1);
    };

    const next = () => {
        if (idx + 1 >= total) {
            setFinished(true);
            markStreak(streak, setStreak, streakSaved.ready);
            pushActivity(`📝 ${unit.title} — ${pct}%`);
            const prev = scores[unit.id];
            if (saved.ready) {
                setScores({
                    ...scores,
                    [unit.id]: {
                        best: Math.max(prev?.best ?? 0, pct),
                        attempts: (prev?.attempts ?? 0) + 1,
                        last: pct,
                    },
                });
            }
        } else {
            setIdx(i => i + 1);
            setChosen(null);
        }
    };

    if (finished) {
        const verdict = pct >= 85 ? t('quiz.verdictHigh') : pct >= 60 ? t('quiz.verdictMid') : t('quiz.verdictLow');
        return <div className="zak-center">
            <div className="zak-result-ring"><bdi>{pct}%</bdi></div>
            <Group label={unit.short} heading={t('quiz.doneH')}>
                <div className="zak-center">
                    <span>{fmt('quiz.scoreLine', { c: correctCount, n: total })}</span>
                    <Caption>{verdict}</Caption>
                    {saved.message && <Caption>{saved.message}</Caption>}
                </div>
                <div className="zak-actions">
                    <FileButton variant="secondary" onClick={onExit}>{t('quiz.pickAnother')}</FileButton>
                </div>
            </Group>
        </div>;
    }

    return <>
        <Group label={unit.short} heading={fmt('quiz.question', { a: idx + 1, n: total })}>
            <div className="zak-progress">
                <div className="zak-progress-bar"><div className="zak-progress-fill" style={{ width: `${(idx / total) * 100}%` }} /></div>
                <span><bdi>{idx + 1}</bdi>/<bdi>{total}</bdi></span>
            </div>
            <p className="zak-question">{question.q}</p>
            {ttsSupported && <button type="button" className="zak-speak" onClick={() => speak(`${question.q} ${question.choices.join('، ')}`)}>{t('quiz.listenQ')}</button>}
            <div className="zak-choices">
                {question.choices.map((c, i) => {
                    let state = '';
                    if (chosen !== null) {
                        if (i === question.answer) state = 'correct';
                        else if (i === chosen) state = 'wrong';
                        else state = 'muted';
                    }
                    return <button key={i} type="button" className="zak-choice" data-state={state} disabled={chosen !== null} onClick={() => choose(i)}>
                        <span className="zak-choice-letter">{letters()[i]}</span>
                        <span>{c}</span>
                    </button>;
                })}
            </div>
            {chosen !== null && <div className="zak-explain">
                <div className="zak-explain-title" data-tone={chosen === question.answer ? 'correct' : 'wrong'}>
                    {chosen === question.answer ? t('quiz.correct') : t('quiz.wrong')}
                </div>
                {question.explain}
            </div>}
            {chosen !== null && <div className="zak-actions">
                <FileButton onClick={next}>{idx + 1 >= total ? t('quiz.seeResult') : t('quiz.next')}</FileButton>
            </div>}
        </Group>
    </>;
}

/* ---------- تحويل الملاحظات لأسئلة ---------- */

export function AIGen({ onStart }: { onStart: (u: Unit) => void }) {
    const [notes, setNotes] = useState('');
    const [count, setCount] = useState<'5' | '10'>('5');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const canGenerate = notes.trim().length >= 50 && !busy;

    const generate = async () => {
        if (!canGenerate) return;
        setBusy(true);
        setError('');
        try {
            const questions = await generateQuestions(notes.trim(), Number(count));
            onStart({
                id: `ai-${Date.now()}`,
                title: t('ai.title'),
                short: t('quiz.fromNotes'),
                icon: '✨',
                color: '#8a6fb8',
                questions,
            });
            setNotes('');
        } catch {
            setError(t('ai.err'));
        } finally {
            setBusy(false);
        }
    };

    return <Group label={t('ai.label')} heading={t('ai.heading')}>
        <div className="zak-form">
            <textarea
                className="zak-textarea"
                placeholder={t('ai.ph')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                disabled={busy}
            />
            <ChoiceRow
                label={t('ai.count')}
                options={[{ value: '5', label: t('ai.c5') }, { value: '10', label: t('ai.c10') }]}
                value={count}
                onChange={(v: string) => setCount(v as '5' | '10')}
            />
            <FileButton onClick={generate} disabled={!canGenerate}>
                {busy ? t('ai.busy') : t('ai.gen')}
            </FileButton>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>{t('ai.note')}</Caption>
        </div>
    </Group>;
}

/* ---------- أسئلة في أي مادة ---------- */

export function TopicGen({ onStart }: { onStart: (u: Unit) => void }) {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState<'5' | '10'>('5');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const pending = consumePendingTopic();
        if (pending) setTopic(pending);
    }, []);

    const canGenerate = topic.trim().length >= 3 && !busy;

    const generate = async () => {
        if (!canGenerate) return;
        setBusy(true);
        setError('');
        try {
            const questions = await generateTopicQuestions(topic.trim(), Number(count));
            onStart({
                id: `topic-${Date.now()}`,
                title: topic.trim(),
                short: t('quiz.anySubject'),
                icon: '🌍',
                color: '#3f6f63',
                questions,
            });
            setTopic('');
        } catch {
            setError(t('ai.err'));
        } finally {
            setBusy(false);
        }
    };

    return <Group label={t('topic.label')} heading={t('topic.heading')}>
        <div className="zak-form">
            <TextField
                label={t('topic.field')}
                value={topic}
                onChange={setTopic}
                placeholder={t('topic.ph')}
            />
            <ChoiceRow
                label={t('ai.count')}
                options={[{ value: '5', label: t('ai.c5') }, { value: '10', label: t('ai.c10') }]}
                value={count}
                onChange={(v: string) => setCount(v as '5' | '10')}
            />
            <FileButton onClick={generate} disabled={!canGenerate}>
                {busy ? t('ai.busy') : t('topic.gen')}
            </FileButton>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>{t('topic.note')}</Caption>
        </div>
    </Group>;
}

export function Quiz() {
    const [selected, setSelected] = useState<Unit | null>(null);
    if (!selected) return <>
        <TopicGen onStart={setSelected} />
        <AIGen onStart={setSelected} />
    </>;
    return <QuizRun key={selected.id} unit={selected} onExit={() => setSelected(null)} />;
}
