/* طبقة الذكاء الاصطناعي: بتكلم خدمة ذكاء اصطناعي مجانية مباشرة من المتصفح.
   مفيش مفاتيح ولا حسابات — الخدمة مجانية ومفتوحة، والملاحظات بتتبعت ليها عشان التوليد بس.
   فيه إعادة محاولة تلقائية مع failover، وبث مباشر للردود، وطقس حقيقي من Open-Meteo. */

import type { Question } from './data/types';

const API = 'https://text.pollinations.ai/';
const API_OPENAI = 'https://text.pollinations.ai/openai';

/* لغة واجهة التطبيق — بتتحدد من إعدادات المستخدم، والمساعد بيرد بنفس اللغة */
type AiLang = 'ar' | 'en';
let uiLang: AiLang = 'ar';
export function setAiLang(l: AiLang): void {
    uiLang = l;
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

/* طلب POST مع إعادة محاولة بتأخير متزايد */
/* الخدمة المجانية بتقيّد الطلبات أحيانًا (HTTP 402/429)، فبنلف على كل المسارات المتاحة:
   /openai (chat completions) → GET بسيط → POST بسيط — بفواصل متزايدة لحد ما واحد فيهم ينجح */
async function postOpenAI(messages: ChatMessage[], timeoutMs: number): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(API_OPENAI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'openai-fast', messages }),
            signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json() as { choices?: { message?: { content?: string } }[] };
        const txt = (j.choices?.[0]?.message?.content ?? '').trim();
        if (txt) return txt;
        throw new Error('empty');
    } finally {
        clearTimeout(timer);
    }
}

async function postSimple(messages: ChatMessage[], jsonMode: boolean, timeoutMs: number): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, model: 'openai-fast', jsonMode }),
            signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = (await res.text()).trim();
        if (txt) return txt;
        throw new Error('empty');
    } finally {
        clearTimeout(timer);
    }
}

async function getSimple(prompt: string, timeoutMs: number): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${API}${encodeURIComponent(prompt.slice(0, 1500))}?model=openai-fast`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = (await res.text()).trim();
        if (txt) return txt;
        throw new Error('empty');
    } finally {
        clearTimeout(timer);
    }
}

async function callAI(messages: ChatMessage[], jsonMode: boolean, timeoutMs = 90000): Promise<string> {
    const sys = messages.find(m => m.role === 'system')?.content ?? '';
    const lastU = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const getPrompt = `${sys}\n\n${lastU}`;
    const tries: Array<() => Promise<string>> = [
        () => postOpenAI(messages, timeoutMs),
        () => getSimple(getPrompt, timeoutMs),
        () => postSimple(messages, jsonMode, timeoutMs),
        () => getSimple(getPrompt, timeoutMs),
        () => postOpenAI(messages, timeoutMs),
    ];
    const waits = [0, 3000, 10000, 25000, 50000];
    let lastErr: unknown;
    for (let attempt = 0; attempt < tries.length; attempt++) {
        if (waits[attempt] > 0) await new Promise(r => setTimeout(r, waits[attempt]));
        try {
            return await tries[attempt]();
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

/* بث مباشر للرد (SSE) لو متاح، مع رجوع تلقائي للطريقة العادية */
export async function streamAI(messages: ChatMessage[], onToken: (full: string) => void): Promise<string> {
    try {
        const res = await fetch(API_OPENAI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'openai-fast', messages, stream: true }),
        });
        if (!res.ok || !res.body) throw new Error('no-stream');
        const reader = (res.body as ReadableStream<Uint8Array>).getReader();
        const dec = new TextDecoder();
        let acc = '';
        let buf = '';
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
                const l = line.trim();
                if (!l.startsWith('data:')) continue;
                const data = l.slice(5).trim();
                if (data === '[DONE]') continue;
                try {
                    const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
                    const piece = j.choices?.[0]?.delta?.content ?? '';
                    if (piece) {
                        acc += piece;
                        onToken(acc);
                    }
                } catch { /* سطر ناقص، تجاهله */ }
            }
        }
        if (acc.trim()) return acc.trim();
        throw new Error('empty-stream');
    } catch {
        const full = await callAI(messages, false, 60000);
        onToken(full);
        return full;
    }
}

function extractJson(text: string): string {
    let t = text.trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return t.slice(start, end + 1);
    return t;
}

const QUIZ_SYSTEM_AR = `أنت مساعد بتولد أسئلة اختيار من متعدد من ملاحظات طالب مصري في تانية باكالوريا. اكتب بالعربي الفصيح البسيط. رد بـ JSON صالح فقط بدون أي كلام زيادة، بالشكل ده بالظبط:
{"questions":[{"q":"نص السؤال","choices":["اختيار 1","اختيار 2","اختيار 3","اختيار 4"],"answer":0,"explain":"شرح قصير ليه دي الإجابة الصح"}]}
القواعد: 4 اختيارات لكل سؤال، answer رقم الاختيار الصح من 0 لـ 3، الأسئلة من الملاحظات نفسها بس، واختبر الفهم مش الحفظ بس.`;

const QUIZ_SYSTEM_EN = `You generate multiple-choice questions from a student's notes. Write in simple clear English. Reply with valid JSON only, exactly in this shape:
{"questions":[{"q":"question text","choices":["choice 1","choice 2","choice 3","choice 4"],"answer":0,"explain":"short explanation why this is correct"}]}
Rules: 4 choices per question, answer is the index of the correct choice 0-3, questions from the notes only, test understanding not just memorization.`;

function parseQuestionsJson(text: string): Question[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(extractJson(text));
    } catch {
        throw new Error('bad-json');
    }
    const raw = (parsed as { questions?: unknown }).questions;
    if (!Array.isArray(raw) || raw.length === 0) throw new Error('bad-shape');
    const fallback = uiLang === 'en' ? 'Review the lesson or ask the assistant about it.' : 'راجع الدرس أو اسأل المساعد عنها.';
    const questions: Question[] = [];
    for (const item of raw) {
        const q = item as Record<string, unknown>;
        if (
            typeof q.q === 'string' && q.q.trim() &&
            Array.isArray(q.choices) && q.choices.length === 4 && q.choices.every(c => typeof c === 'string' && c.trim()) &&
            typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3
        ) {
            questions.push({
                q: q.q.trim().replace(/^(س\d+|سؤال|Q\d*|Question)\s*[:\-ـ.]\s*/i, ''),
                choices: (q.choices as string[]).map(c => c.trim().replace(/^(أ|ب|جـ|ج|د|[A-Da-d]|[0-9١-٤]+)\s*[\.、\)\:\-ـ]\s*/, '')),
                answer: q.answer,
                explain: typeof q.explain === 'string' && q.explain.trim() ? q.explain.trim() : fallback,
            });
        }
    }
    if (questions.length === 0) throw new Error('bad-shape');
    return questions;
}

export async function generateQuestions(notes: string, count: number): Promise<Question[]> {
    const sys = uiLang === 'en' ? QUIZ_SYSTEM_EN : QUIZ_SYSTEM_AR;
    const user = uiLang === 'en'
        ? `Turn these notes into ${count} multiple-choice questions:\n\n${notes}`
        : `حوّل الملاحظات دي لـ ${count} أسئلة اختيار من متعدد:\n\n${notes}`;
    const text = await callAI([
        { role: 'system', content: sys },
        { role: 'user', content: user },
    ], true);
    return parseQuestionsJson(text);
}

const TOPIC_SYSTEM_AR = `أنت مساعد بتولد أسئلة اختيار من متعدد في أي مادة أو موضوع لطالب مصري في تانية باكالوريا. اكتب بالعربي الفصيح البسيط. رد بـ JSON صالح فقط بدون أي كلام زيادة، بالشكل ده بالظبط:
{"questions":[{"q":"نص السؤال","choices":["اختيار 1","اختيار 2","اختيار 3","اختيار 4"],"answer":0,"explain":"شرح قصير ليه دي الإجابة الصح"}]}
القواعد: 4 اختيارات لكل سؤال، answer رقم الاختيار الصح من 0 لـ 3، الأسئلة عن الموضوع المطلوب بالظبط وبمستوى طالب ثانوي، واختبر الفهم مش الحفظ بس.`;

const TOPIC_SYSTEM_EN = `You generate multiple-choice questions on any subject or topic for a high-school student. Write in simple clear English. Reply with valid JSON only, exactly in this shape:
{"questions":[{"q":"question text","choices":["choice 1","choice 2","choice 3","choice 4"],"answer":0,"explain":"short explanation why this is correct"}]}
Rules: 4 choices per question, answer is the index of the correct choice 0-3, questions about exactly the requested topic at high-school level, test understanding not just memorization.`;

export async function generateTopicQuestions(topic: string, count: number): Promise<Question[]> {
    const sys = uiLang === 'en' ? TOPIC_SYSTEM_EN : TOPIC_SYSTEM_AR;
    const user = uiLang === 'en'
        ? `Write ${count} multiple-choice questions about: ${topic}`
        : `اكتب ${count} أسئلة اختيار من متعدد عن: ${topic}`;
    const text = await callAI([
        { role: 'system', content: sys },
        { role: 'user', content: user },
    ], true);
    return parseQuestionsJson(text);
}

const ASK_SYSTEM_AR = `أنت "NOVA"، مساعد ذكي ودود لطالب مصري في تانية باكالوريا. جاوب بالعربية المصري البسيط، في ٣-٤ جمل بس، من غير تنسيقات ولا نقط، عشان الإجابة ممكن تتقال بصوت عالي. جاوب على أي سؤال في أي موضوع بشكل مفيد وصادق، ولو السؤال في المنهج اشرح ببساطة من الأول.`;

const DEEP_SYSTEM_AR = `أنت "NOVA"، مساعد ذكي لطالب مصري في تانية باكالوريا في وضع التفكير العميق. فكّر خطوة بخطوة وجاوب بالعربية المصري الواضحة بشرح مفصّل ومنظم: المفهوم، مثال عملي، وأخطاء شائعة لو فيه. جاوب على أي سؤال في أي موضوع بعمق وصدق.`;

const DEEP_SYSTEM_EN = `You are "NOVA", a smart assistant for a high-school student in deep-thinking mode. Reason step by step and answer in clear English with a detailed structured explanation: the concept, a practical example, and common mistakes if any. Answer any question on any topic with depth and honesty.`;

const ASK_SYSTEM_EN = `You are "NOVA", a friendly smart assistant for a high-school student. Answer in simple clear English, in 3-4 sentences only, with no formatting or bullet points, because the answer may be spoken aloud. Answer any question on any topic helpfully and honestly, and if the question is about school material explain simply from the basics.`;

export async function askZekrly(history: ChatMessage[]): Promise<string> {
    const sys = uiLang === 'en' ? ASK_SYSTEM_EN : ASK_SYSTEM_AR;
    const text = await callAI([{ role: 'system', content: sys }, ...history.slice(-10)], false, 60000);
    return text;
}

export async function askZekrlyStream(history: ChatMessage[], onToken: (full: string) => void, deep = false): Promise<string> {
    const sys = deep
        ? (uiLang === 'en' ? DEEP_SYSTEM_EN : DEEP_SYSTEM_AR)
        : (uiLang === 'en' ? ASK_SYSTEM_EN : ASK_SYSTEM_AR);
    return streamAI([{ role: 'system', content: sys }, ...history.slice(-10)], onToken);
}

/* ---------- الطقس الحقيقي (Open-Meteo — مجاني بدون مفتاح) ---------- */

const WX_RE = /(الجو|الطقس|درجة الحرارة|الحراره|الحرارة|برد|حرّ|حر |مطر|أمطار|امطار|weather|temperature|rain)/i;

export function isWeatherQuery(text: string): boolean {
    return WX_RE.test(text);
}

const WX_CODES: Record<number, [string, string]> = {
    0: ['صافي', 'clear sky'], 1: ['صافي غالبًا', 'mostly clear'], 2: ['غائم جزئيًا', 'partly cloudy'], 3: ['غائم', 'overcast'],
    45: ['ضباب', 'fog'], 48: ['ضباب متجمد', 'icy fog'],
    51: ['رذاذ خفيف', 'light drizzle'], 53: ['رذاذ', 'drizzle'], 55: ['رذاذ غزير', 'heavy drizzle'],
    61: ['مطر خفيف', 'light rain'], 63: ['مطر', 'rain'], 65: ['مطر غزير', 'heavy rain'],
    66: ['مطر متجمد', 'freezing rain'], 67: ['مطر متجمد غزير', 'heavy freezing rain'],
    71: ['ثلج خفيف', 'light snow'], 73: ['ثلج', 'snow'], 75: ['ثلج غزير', 'heavy snow'], 77: ['حبيبات ثلج', 'snow grains'],
    80: ['زخات مطر خفيفة', 'light showers'], 81: ['زخات مطر', 'showers'], 82: ['زخات مطر غزيرة', 'heavy showers'],
    85: ['زخات ثلج', 'snow showers'], 86: ['زخات ثلج غزيرة', 'heavy snow showers'],
    95: ['عاصفة رعدية', 'thunderstorm'], 96: ['عاصفة رعدية مع برد', 'thunderstorm with hail'], 99: ['عاصفة رعدية قوية مع برد', 'severe thunderstorm with hail'],
};

interface WxCache { ts: number; place: string; text: string }
const WX_KEY = 'tutora.weather.v1';

function extractPlace(text: string): string | null {
    const m = text.match(/(?:في|بـ|ب)\s+([ء-يA-Za-z\s]{3,30})/);
    if (!m) return null;
    const p = m[1].trim();
    return /(النهاردة|النهارده|دلوقتي|اليوم)/.test(p) ? null : p;
}

async function geocode(name: string): Promise<{ lat: number; lon: number; label: string } | null> {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ar&format=json`);
    if (!res.ok) return null;
    const j = await res.json() as { results?: { latitude: number; longitude: number; name: string; country?: string }[] };
    const r = j.results?.[0];
    return r ? { lat: r.latitude, lon: r.longitude, label: r.name } : null;
}

export async function answerWeather(question: string): Promise<string> {
    const offlineMsg = uiLang === 'en' ? 'Weather needs internet, and it looks offline right now. Try again when you are connected.' : 'الطقس محتاج نت، وشكله مقطوع دلوقتي. جرب تاني لما النت يرجع.';
    try {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) return offlineMsg;
    } catch { /* ignore */ }

    const place = extractPlace(question);
    const cacheKey = `${WX_KEY}:${place ?? 'default'}`;
    try {
        const raw = window.localStorage.getItem(cacheKey);
        if (raw) {
            const c = JSON.parse(raw) as WxCache;
            if (Date.now() - c.ts < 10 * 60 * 1000) return c.text;
        }
    } catch { /* ignore */ }

    let geo = place ? await geocode(place) : null;
    if (!geo && !place) geo = await geocode(uiLang === 'en' ? 'Timayy al Imdid' : 'تمي الامديد');
    if (!geo) geo = await geocode(uiLang === 'en' ? 'Mansoura' : 'المنصورة');
    if (!geo) geo = { lat: 30.0444, lon: 31.2357, label: uiLang === 'en' ? 'Cairo' : 'القاهرة' };

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Africa%2FCairo`);
    if (!res.ok) throw new Error('wx-http');
    const j = await res.json() as { current?: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number } };
    const c = j.current;
    if (!c) throw new Error('wx-shape');
    const [descAr, descEn] = WX_CODES[c.weather_code] ?? ['جو متقلب', 'mixed weather'];
    const temp = Math.round(c.temperature_2m);
    const feels = Math.round(c.apparent_temperature);
    const wind = Math.round(c.wind_speed_10m);
    const text = uiLang === 'en'
        ? `Weather in ${geo.label} now: ${descEn}, temperature ${temp}°C, feels like ${feels}°C, wind ${wind} km/h.`
        : `الجو في ${geo.label} دلوقتي: ${descAr}، درجة الحرارة ${temp}° والإحساس بيها ${feels}°، والرياح ${wind} كم/ساعة.`;
    try {
        window.localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), place: geo.label, text } satisfies WxCache));
    } catch { /* ignore */ }
    return text;
}

/* ---------- الصوت ---------- */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (cachedVoice && voices.includes(cachedVoice)) return cachedVoice;
    cachedVoice = uiLang === 'en'
        ? (voices.find(v => /^en([-_]US)/i.test(v.lang)) ?? voices.find(v => /^en/i.test(v.lang)) ?? null)
        : (voices.find(v => /^ar([-_]EG)/i.test(v.lang)) ?? voices.find(v => /^ar/i.test(v.lang)) ?? null);
    return cachedVoice;
}

export function speak(text: string, onEnd?: () => void): boolean {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = uiLang === 'en' ? 'en-US' : 'ar-EG';
    u.rate = 0.95;
    const v = pickVoice();
    if (v) u.voice = v;
    if (onEnd) {
        u.onend = onEnd;
        u.onerror = onEnd;
    }
    window.speechSynthesis.speak(u);
    return true;
}

export function stopSpeaking(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

/* ---------- موسيقى خلفية هادية (متولدة برمجيًا — بدون ملفات وبدون حقوق) ---------- */

let ambientNodes: { stop: () => void } | null = null;

/* باد ناعم جدًا: ٣ نغمات بطيئة بتتعاقب بهدوء، صوت واطي خالص */
export function startAmbient(): void {
    try {
        if (ambientNodes) return;
        const w = window as unknown as Record<string, unknown>;
        const AC = (w.AudioContext ?? w.webkitAudioContext) as (new () => AudioContext) | undefined;
        if (!AC) return;
        audioCtx = audioCtx ?? new AC();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
        const master = ctx.createGain();
        master.gain.value = 0.035;
        master.connect(ctx.destination);
        const chords = [
            [261.63, 329.63, 392.00],
            [220.00, 261.63, 329.63],
            [174.61, 220.00, 261.63],
            [196.00, 246.94, 293.66],
        ];
        let chordIdx = 0;
        let stopped = false;
        const timers: number[] = [];
        const playChord = () => {
            if (stopped) return;
            const notes = chords[chordIdx % chords.length];
            chordIdx++;
            notes.forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.value = f * 0.5;
                const t = ctx.currentTime + i * 0.6;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.16, t + 2.2);
                g.gain.linearRampToValueAtTime(0.0001, t + 7.5);
                o.connect(g);
                g.connect(master);
                o.start(t);
                o.stop(t + 8);
            });
            timers.push(window.setTimeout(playChord, 6000));
        };
        playChord();
        ambientNodes = {
            stop: () => {
                stopped = true;
                timers.forEach(clearTimeout);
                try { master.disconnect(); } catch { /* ignore */ }
            },
        };
    } catch { /* تجاهل */ }
}

export function stopAmbient(): void {
    try {
        ambientNodes?.stop();
    } catch { /* ignore */ }
    ambientNodes = null;
}

/* ---------- نغمة البداية (مهددة هادية، متولدة برمجيًا — مفيش حقوق موسيقى) ---------- */

let audioCtx: AudioContext | null = null;

export function playChime(): void {
    try {
        const w = window as unknown as Record<string, unknown>;
        const AC = (w.AudioContext ?? w.webkitAudioContext) as (new () => AudioContext) | undefined;
        if (!AC) return;
        audioCtx = audioCtx ?? new AC();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            const t = ctx.currentTime + i * 0.18;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(t);
            o.stop(t + 1);
        });
    } catch { /* تجاهل */ }
}

export interface SpeechRecog {
    start(): void;
    stop(): void;
    abort(): void;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
}

export function createRecognizer(): SpeechRecog | null {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecog) | undefined;
    if (!Ctor) return null;
    const r = new Ctor();
    r.lang = uiLang === 'en' ? 'en-US' : 'ar-EG';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    return r;
}
