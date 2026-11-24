import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Callout, Caption, ChoiceRow, Closing, FileButton, FileCard, Group, Header,
    Link, NavLink, Route, Routes, TextField, useLocalState,
} from './kit';
import type { Unit } from './data/types';
import { askZekrly, createRecognizer, generateQuestions, generateTopicQuestions, playChime, speak, stopSpeaking, ttsSupported } from './ai';
import logoUrl from './photos/logo.png';

/* ---------- shared helpers ---------- */

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function toISO(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

function fromISO(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function todayISO(): string {
    return toISO(new Date());
}

function dayDiff(fromIso: string, toIsoDate: Date): number {
    const a = fromISO(fromIso);
    return Math.round((toIsoDate.getTime() - a.getTime()) / 86400000);
}

function arabicDate(iso: string): string {
    const d = fromISO(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const CHOICE_LETTERS = ['أ', 'ب', 'جـ', 'د'];

/* ---------- scores ---------- */

interface Score { best: number; attempts: number; last: number }

function useScores() {
    return useLocalState<Record<string, Score>>('zakarely.scores.v1', {});
}

/* ---------- streak ---------- */

function useStreak() {
    return useLocalState<{ days: string[] }>('zakarely.streak.v1', { days: [] });
}

function markStreak(streak: { days: string[] }, setStreak: (v: { days: string[] }) => void, ready: boolean) {
    if (!ready) return;
    const t = todayISO();
    if (!streak.days.includes(t)) setStreak({ days: [...streak.days, t].slice(-60) });
}

function streakCount(days: string[]): number {
    const set = new Set(days);
    let d = new Date();
    if (!set.has(toISO(d))) d = new Date(d.getTime() - 86400000);
    let n = 0;
    while (set.has(toISO(d))) { n++; d = new Date(d.getTime() - 86400000); }
    return n;
}

function streakLabel(n: number): string {
    return n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوم`;
}

/* ---------- home ---------- */

export const ROADMAP_TEXT = "تقدر تحوّل أي ملاحظات لأسئلة من صفحة \"اختبر نفسك\"، وتسأل مساعد ذكي من \"اسأل Tutora\". وجاي بعد كده: بنك أسئلة امتحانات من المدرسين، أدوات للمدرسين (مخططات دروس وامتحانات)، شغل أوفلاين كامل، تسجيل دخول سهل، تصوير أي شرح أو صفحة وتحويلها لأسئلة وملخص، تسجيل المحاضرة وتفريغها نص مع امتحان منها، وضع \"اشرحلي الدرس من الأول\" لو مش فاهم حاجة، مساعد يفهم صور وصوت وملفات، ملخصات صوتية، غرف مذاكرة لايف بتحدي بين الأصحاب، وترتيب أسبوعي بينكم، قسم إعدادات فيه وضع ليلي وتحكم في الصوت، وتوليد ملفات ومشاريع كاملة بالذكاء الاصطناعي زي الأدوات الاحترافية، قاموس إنجليزي-عربي يشتغل بدون نت، تلخيص المنهج ومراجعة شاملة للم لمّه كله، تدريب على أسئلة الوزارة، مدرس صوتي بيتكلم مصري، تصوير أي سؤال بالكاميرا وحله خطوة بخطوة، شخصية بتكبر مع تقدمك وبتتعمل من صورتك، محاكاة يوم الامتحان الحقيقي، فلاش كاردز من أي درس، باتل لايف مع أصحابك، شرح بالرسم على سبورة، توليد صور تعليمية، خزنة مشفرة لكلمات السر، ذاكرة كاملة ماتنساش أي تفصيلة، تقرير أسبوعي بتقدمك، صور إنجازات تشاركها، اختبار تحديد مستوى، نسخ احتياطي لبياناتك، تطبيق أندرويد حقيقي (APK) وعلى متجر بلاي، لوحة تحكم ليك انت تدير بيها التطبيق، نموذج دعم فني وشكاوى، صفحة سياسة خصوصية كاملة، إشعارات بتنبهك بالمذاكرة، دعم قارئ الشاشة وتكبير الخط وسهولة الاستخدام لكل الطلبة، واجهة بكل اللغات، وبحث في الويب عن أي حاجة — وأي ميزات جماعية هتبقى خصوصية أولًا: اسم مستعار اختياري، إمكانية مجموعات للبنات بس، ومفيش تواصل خاص غير بموافقة الطرفين.";

function Home() {
    const [streakData] = useStreak();
    const streakN = streakCount(streakData.days);
    return <>
        <div className="zak-hero">
            <img src={logoUrl} alt="لوجو Tutora" className="zak-home-logo" />
            <span className="zak-hero-hi">أهلًا بيك 👋</span>
            <span className="zak-maker">صنع بواسطة <bdi>Mohamed Nabil Al-Najjar</bdi> 🛠️</span>
            {streakN > 0 && <span className="zak-streak">🔥 سلسلة مذاكرتك: {streakLabel(streakN)} متتالية</span>}
            <div className="zak-actions">
                <Link to="/quiz" className="zak-action"><span className="zak-action-ic">📝</span><span>اختبر نفسك</span></Link>
                <Link to="/ask" className="zak-action"><span className="zak-action-ic">💬</span><span>اسأل Tutora</span></Link>
                <Link to="/planner" className="zak-action"><span className="zak-action-ic">🗓️</span><span>الخطة الذكية</span></Link>
            </div>
        </div>
    </>;
}

/* ---------- quiz ---------- */

function QuizRun({ unit, onExit }: { unit: Unit; onExit: () => void }) {
    const [order] = useState(() => shuffle(unit.questions.map((_, i) => i)));
    const [idx, setIdx] = useState(0);
    const [chosen, setChosen] = useState<number | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [finished, setFinished] = useState(false);
    const [scores, setScores, saved] = useScores();
    const [streak, setStreak, streakSaved] = useStreak();

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
        const verdict = pct >= 85 ? 'ممتاز! أنت جاهز جدًا في الوحدة دي.' : pct >= 60 ? 'كويس! راجع الأسئلة اللي غلطت فيها وهتبقى تمام.' : 'محتاج تراجع الوحدة دي كويس وتعيد الاختبار.';
        return <div className="zak-center">
            <div className="zak-result-ring"><bdi>{pct}%</bdi></div>
            <Group label={unit.short} heading="خلصت الاختبار">
                <div className="zak-center">
                    <span><bdi>{correctCount}</bdi> إجابة صح من <bdi>{total}</bdi></span>
                    <Caption>{verdict}</Caption>
                    {saved.message && <Caption>{saved.message}</Caption>}
                </div>
                <div className="zak-actions">
                    <FileButton variant="secondary" onClick={onExit}>اختار وحدة تانية</FileButton>
                </div>
            </Group>
        </div>;
    }

    return <>
        <Group label={unit.short} heading={`سؤال ${idx + 1} من ${total}`}>
            <div className="zak-progress">
                <div className="zak-progress-bar"><div className="zak-progress-fill" style={{ width: `${(idx / total) * 100}%` }} /></div>
                <span><bdi>{idx + 1}</bdi>/<bdi>{total}</bdi></span>
            </div>
            <p className="zak-question">{question.q}</p>
            {ttsSupported && <button type="button" className="zak-speak" onClick={() => speak(`${question.q} الاختيارات: ${question.choices.join('، ')}`)}>🔊 اسمع السؤال</button>}
            <div className="zak-choices">
                {question.choices.map((c, i) => {
                    let state = '';
                    if (chosen !== null) {
                        if (i === question.answer) state = 'correct';
                        else if (i === chosen) state = 'wrong';
                        else state = 'muted';
                    }
                    return <button key={i} type="button" className="zak-choice" data-state={state} disabled={chosen !== null} onClick={() => choose(i)}>
                        <span className="zak-choice-letter">{CHOICE_LETTERS[i]}</span>
                        <span>{c}</span>
                    </button>;
                })}
            </div>
            {chosen !== null && <div className="zak-explain">
                <div className="zak-explain-title" data-tone={chosen === question.answer ? 'correct' : 'wrong'}>
                    {chosen === question.answer ? 'إجابة صحيحة' : 'إجابة غلط'}
                </div>
                {question.explain}
            </div>}
            {chosen !== null && <div className="zak-actions">
                <FileButton onClick={next}>{idx + 1 >= total ? 'شوف النتيجة' : 'السؤال اللي بعده'}</FileButton>
            </div>}
        </Group>
    </>;
}

/* ---------- AI notes-to-quiz ---------- */

function AIGen({ onStart }: { onStart: (u: Unit) => void }) {
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
                title: 'أسئلة من ملاحظاتك',
                short: 'من ملاحظاتك ✨',
                icon: '✨',
                color: '#8a6fb8',
                questions,
            });
            setNotes('');
        } catch {
            setError('مقدرناش نولد الأسئلة دلوقتي. ممكن الخدمة تكون زحمة، جرب تاني بعد شوية.');
        } finally {
            setBusy(false);
        }
    };

    return <Group label="جديد ✨" heading="حوّل ملاحظاتك لأسئلة">
        <div className="zak-form">
            <textarea
                className="zak-textarea"
                placeholder="الصق ملاحظاتك أو جزء من الدرس هنا (٥٠ حرف على الأقل)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                disabled={busy}
            />
            <ChoiceRow
                label="عدد الأسئلة"
                options={[{ value: '5', label: '5 أسئلة' }, { value: '10', label: '10 أسئلة' }]}
                value={count}
                onChange={(v: string) => setCount(v as '5' | '10')}
            />
            <FileButton onClick={generate} disabled={!canGenerate}>
                {busy ? 'بنكتب أسئلتك… ممكن تاخد دقيقة ⏳' : 'ولد الأسئلة ✨'}
            </FileButton>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>الأسئلة بتتولد بذكاء اصطناعي مجاني، وملاحظاتك بتتبعت للخدمة عشان التوليد بس. راجع الأسئلة مع المنهج، ممكن يغلط أحيانًا.</Caption>
        </div>
    </Group>;
}


/* ---------- أسئلة في أي مادة ---------- */

function TopicGen({ onStart }: { onStart: (u: Unit) => void }) {
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState<'5' | '10'>('5');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

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
                short: 'أي مادة 🌍',
                icon: '🌍',
                color: '#3f6f63',
                questions,
            });
            setTopic('');
        } catch {
            setError('مقدرناش نولد الأسئلة دلوقتي. ممكن الخدمة تكون زحمة، جرب تاني بعد شوية.');
        } finally {
            setBusy(false);
        }
    };

    return <Group label="بلا حدود 🌍" heading="أسئلة في أي مادة أو موضوع">
        <div className="zak-form">
            <TextField
                label="المادة أو الموضوع"
                value={topic}
                onChange={setTopic}
                placeholder="مثال: نحو - المفعول به، فيزياء - التيار الكهربي، تاريخ مصر الحديث..."
            />
            <ChoiceRow
                label="عدد الأسئلة"
                options={[{ value: '5', label: '5 أسئلة' }, { value: '10', label: '10 أسئلة' }]}
                value={count}
                onChange={(v: string) => setCount(v as '5' | '10')}
            />
            <FileButton onClick={generate} disabled={!canGenerate}>
                {busy ? 'بنكتب أسئلتك… ممكن تاخد دقيقة ⏳' : 'ولد الأسئلة 🌍'}
            </FileButton>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>الذكاء الاصطناعي بيكتب أسئلة جديدة كل مرة في أي مادة تطلبها، من غير حد أقصى. راجع الإجابات مع كتبك، ممكن يغلط أحيانًا.</Caption>
        </div>
    </Group>;
}

/* ---------- AI voice assistant ---------- */

interface ChatMsg { role: 'user' | 'assistant'; text: string }

function Ask() {
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [listening, setListening] = useState(false);
    const [recogAvailable] = useState(() => createRecognizer() !== null);

    useEffect(() => () => stopSpeaking(), []);

    const send = async (raw: string, byVoice = false) => {
        const text = raw.trim();
        if (!text || busy) return;
        const next: ChatMsg[] = [...msgs, { role: 'user', text }];
        setMsgs(next);
        setInput('');
        setBusy(true);
        setError('');
        try {
            const reply = await askZekrly(next.map(m => ({ role: m.role, content: m.text })));
            setMsgs([...next, { role: 'assistant', text: reply }]);
            if (byVoice) speak(reply);
        } catch {
            setError('مقدرتش أرد دلوقتي. جرب تاني بعد شوية.');
        } finally {
            setBusy(false);
        }
    };

    const startListening = () => {
        const r = createRecognizer();
        if (!r || listening || busy) return;
        setListening(true);
        r.onresult = e => {
            const said = e.results[0]?.[0]?.transcript ?? '';
            setListening(false);
            if (said.trim()) send(said, true);
        };
        r.onerror = () => setListening(false);
        r.onend = () => setListening(false);
        try { r.start(); } catch { setListening(false); }
    };

    return <>
        <Group label="المساعد الذكي" heading="اسأل Tutora 🎙️">
            <div className="zak-chat">
                {msgs.length === 0 && <Caption>اسأل أي حاجة في المنهج أو غيره، بالكتابة أو بالمايك. لو سألت بصوتك، الرد هيتقال بصوت عالي.</Caption>}
                {msgs.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'zak-msg zak-msg-user' : 'zak-msg zak-msg-ai'}>
                        <span className="zak-msg-text">{m.text}</span>
                        {m.role === 'assistant' && ttsSupported && (
                            <button type="button" className="zak-msg-speak" aria-label="اسمع الرد" onClick={() => speak(m.text)}>🔊</button>
                        )}
                    </div>
                ))}
                {busy && <div className="zak-msg zak-msg-ai"><span className="zak-msg-text">بفكر…</span></div>}
            </div>
            <div className="zak-chat-input">
                {recogAvailable && (
                    <button type="button" className="zak-mic" data-on={listening ? '1' : '0'} onClick={startListening} aria-label="اسأل بصوتك">
                        {listening ? '⏹' : '🎙️'}
                    </button>
                )}
                <input
                    type="text"
                    className="zak-chat-text"
                    placeholder="اكتب سؤالك هنا..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                    disabled={busy}
                />
                <FileButton onClick={() => send(input)} disabled={input.trim() === '' || busy}>ابعت</FileButton>
            </div>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>ردود Tutora بتتولد بذكاء اصطناعي مجاني، وسؤالك بيتبعت للخدمة عشان الرد. ممكن تغلط أحيانًا، والمنهج هو المرجع.</Caption>
        </Group>
    </>;
}

function Quiz() {
    const [selected, setSelected] = useState<Unit | null>(null);
    if (!selected) return <>
        <TopicGen onStart={setSelected} />
        <AIGen onStart={setSelected} />
    </>;
    return <QuizRun key={selected.id} unit={selected} onExit={() => setSelected(null)} />;
}

/* ---------- planner ---------- */

interface Subject { id: string; name: string; exam: string; level: 'سهلة' | 'متوسطة' | 'صعبة' }
interface PlanTask { id: string; subject: string; kind: 'new' | 'review' | 'exam'; label: string }
interface PlanDay { iso: string; tasks: PlanTask[] }

const REVIEW_OFFSETS: Record<Subject['level'], number[]> = {
    'سهلة': [2, 5],
    'متوسطة': [1, 3, 7],
    'صعبة': [1, 2, 4, 7],
};

function buildPlan(subjects: Subject[]): PlanDay[] {
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

function Planner() {
    const [subjects, setSubjects, savedSubjects] = useLocalState<Subject[]>('zakarely.planner.v2', []);
    const [streak, setStreak, streakSaved] = useStreak();
    const [done, setDone, savedDone] = useLocalState<Record<string, boolean>>('zakarely.done.v1', {});
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

    const toggleTask = (id: string) => {
        if (!savedDone.ready) return;
        if (!done[id]) markStreak(streak, setStreak, streakSaved.ready);
        setDone({ ...done, [id]: !done[id] });
    };

    return <>
        <Group label="الخطة الذكية" heading="موادك وامتحاناتك">
            <div className="zak-form">
                <TextField label="اسم المادة" value={name} onChange={setName} />
                <div>
                    <span className="zak-field-label">موعد الامتحان</span>
                    <input type="date" dir="ltr" className="zak-date-input" value={exam} min={minDate} onChange={e => setExam(e.target.value)} />
                </div>
                <ChoiceRow
                    label="المادة دي بالنسبالك"
                    options={[{ value: 'سهلة', label: 'سهلة' }, { value: 'متوسطة', label: 'متوسطة' }, { value: 'صعبة', label: 'صعبة' }]}
                    value={level}
                    onChange={v => setLevel(v as Subject['level'])}
                />
                <div className="zak-actions">
                    <FileButton disabled={!canAdd} onClick={addSubject}>ضيف المادة</FileButton>
                </div>
            </div>
            {subjects.length > 0 && <div className="zak-form">
                {subjects.map(s => (
                    <div key={s.id} className="zak-subject-row">
                        <span className="zak-subject-body">
                            <span className="zak-subject-name">{s.name}</span>
                            <span className="zak-subject-meta">الامتحان <bdi>{arabicDate(s.exam)}</bdi> · {s.level}</span>
                        </span>
                        <button type="button" className="zak-remove" aria-label={`احذف ${s.name}`} onClick={() => removeSubject(s.id)}>×</button>
                    </div>
                ))}
            </div>}
            {(savedSubjects.message || savedDone.message) && <Caption>{savedSubjects.message || savedDone.message}</Caption>}
        </Group>
        {subjects.length === 0 ? (
            <Callout title="ابدأ من فوق" tone="note">ضيف مادة وموعد امتحانها، وTutora هيظبطلك جدول يومي: مذاكرة جديدة وبعدها مراجعات متباعدة لحد يوم الامتحان. المادة الصعبة بتاخد مراجعات أكتر.</Callout>
        ) : (
            <Group label="جدولك" heading="الأيام الجاية">
                {plan.length === 0 && <div className="zak-empty">مفيش أيام في الجدول. تأكد إن مواعيد الامتحانات لسه جاية.</div>}
                {plan.map(day => (
                    <div key={day.iso} className="zak-day" data-today={day.iso === minDate}>
                        <div className="zak-day-head">
                            <span>{day.iso === minDate ? 'النهارده' : WEEKDAYS[fromISO(day.iso).getDay()]}</span>
                            <span className="zak-day-date"><bdi>{arabicDate(day.iso)}</bdi></span>
                        </div>
                        <div className="zak-tasks">
                            {day.tasks.map(t => (
                                <button key={t.id} type="button" className="zak-task" data-done={!!done[t.id]} onClick={() => toggleTask(t.id)}>
                                    <span className="zak-task-check">{done[t.id] ? '✓' : ''}</span>
                                    <span>
                                        <span className="zak-task-name">{t.subject}</span>
                                        <span className="zak-task-kind" data-kind={t.kind}>{t.label}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <Caption>اضغط على أي مهمة لما تخلصها. جدولك ومودك بيتخزنوا على جهازك بس.</Caption>
            </Group>
        )}
    </>;
}

/* ---------- app shell ---------- */


/* ---------- الإعدادات ---------- */

function Settings() {
    const [muted, setMuted] = useLocalState<boolean>('zakarely.mute.v1', false);
    const [theme, setTheme] = useLocalState<string>('zakarely.theme.v1', 'light');
    const [mic, setMic] = useState('...');
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);
    useEffect(() => {
        try {
            const nav = navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
            if (!nav.permissions) { setMic('هيتطلب إذنك أول ما تستخدمه'); return; }
            nav.permissions.query({ name: 'microphone' })
                .then(r => setMic(r.state === 'granted' ? 'متاح ✓' : r.state === 'denied' ? 'مرفوض — تقدر تسمح بيه من إعدادات المتصفح' : 'هيتطلب إذنك أول ما تستخدمه'))
                .catch(() => setMic('هيتطلب إذنك أول ما تستخدمه'));
        } catch {
            setMic('هيتطلب إذنك أول ما تستخدمه');
        }
    }, []);
    return <>
        <Group label="الإعدادات" heading="تحكم في Tutora">
            <ChoiceRow
                label="المظهر"
                options={[{ value: 'light', label: '☀️ فاتح' }, { value: 'dark', label: '🌙 ليلي' }]}
                value={theme}
                onChange={setTheme}
            />
            <ChoiceRow
                label="الصوت (نغمة الافتتاح وصوت المساعد)"
                options={[{ value: 'on', label: '🔊 شغال' }, { value: 'off', label: '🔇 ميوت' }]}
                value={muted ? 'off' : 'on'}
                onChange={(v: string) => setMuted(v === 'off')}
            />
        </Group>
        <Group label="الصلاحيات والخصوصية" heading="بياناتك ملكك">
            <Callout title="الصلاحيات" tone="note">
                المايكروفون: {mic}. أي صلاحية تقدر تلغيها في أي وقت من إعدادات المتصفح، وانت المتحكم دايمًا.
            </Callout>
            <Callout title="الخصوصية أولًا" tone="note">
                كل بياناتك (نتايجك وجدولك وإعداداتك) متخزنة على جهازك بس، مفيش حسابات ولا تتبع ولا بيع بيانات. نص سؤالك أو ملاحظاتك بس هو اللي بيتبعت لخدمة الذكاء الاصطناعي وقت الاستخدام عشان الرد.
            </Callout>
            <details className="zak-roadmap">
                <summary>🗺️ خارطة الطريق: كل اللي جاي في Tutora</summary>
                <Caption>{ROADMAP_TEXT}</Caption>
            </details>
            <Caption>Tutora — من تطوير محمد نبيل النجار (Mohamed Nabil Al-Najjar)</Caption>
        </Group>
    </>;
}

function Splash() {
    const [show, setShow] = useState(true);
    const [muted, setMuted] = useLocalState<boolean>('zakarely.mute.v1', false);
    useEffect(() => {
        if (!muted) playChime();
        const t = setTimeout(() => setShow(false), 2400);
        return () => clearTimeout(t);
    }, []);
    if (!show) return null;
    return <div className="zak-splash" onClick={() => setShow(false)}>
        <button
            type="button"
            className="zak-splash-mute"
            aria-label={muted ? 'شغل الصوت' : 'اقفل الصوت'}
            onClick={e => { e.stopPropagation(); setMuted(!muted); stopSpeaking(); }}
        >{muted ? '🔇' : '🔊'}</button>
        <div className="zak-splash-card">
            <img src={logoUrl} alt="لوجو Tutora" className="zak-splash-img" />
            <span className="zak-splash-logo">Tutora</span>
            <span className="zak-splash-credit">من تطوير محمد نبيل النجار</span>
            <span className="zak-splash-name">Mohamed Nabil Al-Najjar</span>
        </div>
    </div>;
}

export function App() {
    const [theme] = useLocalState<string>('zakarely.theme.v1', 'light');
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    return <FileCard lang="ar" dir="rtl">
        <Splash />
        <Header
            title="Tutora"
            fact="مساعدك الذكي في كل المواد"
        />
        <nav className="zak-nav" aria-label="أقسام Tutora">
            <NavLink to="/" end><span className="zak-tab-ic">🏠</span><span>الرئيسية</span></NavLink>
            <NavLink to="/quiz"><span className="zak-tab-ic">📝</span><span>اختبر نفسك</span></NavLink>
            <NavLink to="/ask"><span className="zak-tab-ic">💬</span><span>اسأل Tutora</span></NavLink>
            <NavLink to="/planner"><span className="zak-tab-ic">🗓️</span><span>الخطة الذكية</span></NavLink>
            <NavLink to="/settings"><span className="zak-tab-ic">⚙️</span><span>الإعدادات</span></NavLink>
        </nav>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/planner" element={<Planner />} />
                    <Route path="/settings" element={<Settings />} />
        </Routes>
        <Closing>Tutora مساعدك الذكي في كل المواد: اسأل أي حاجة، واختبر نفسك في أي موضوع بلا حدود. نتايجك وجدولك بيتخزنوا على جهازك بس. صنع بواسطة <bdi>Mohamed Nabil Al-Najjar</bdi>.</Closing>
    </FileCard>;
}
