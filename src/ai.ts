/* طبقة الذكاء الاصطناعي: بتكلم خدمة ذكاء اصطناعي مجانية مباشرة من المتصفح.
   مفيش مفاتيح ولا حسابات — الخدمة مجانية ومفتوحة، والملاحظات بتتبعت ليها عشان التوليد بس. */

import type { Question } from './data/types';

const API = 'https://text.pollinations.ai/';

/* لغة واجهة التطبيق — بتتحدد من إعدادات المستخدم، والمساعد بيرد بنفس اللغة */
type AiLang = 'ar' | 'en';
let uiLang: AiLang = 'ar';
export function setAiLang(l: AiLang): void {
    uiLang = l;
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

async function callAI(messages: ChatMessage[], jsonMode: boolean, timeoutMs = 120000): Promise<string> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3500));
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
            return (await res.text()).trim();
        } catch (e) {
            lastErr = e;
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
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

const ASK_SYSTEM_AR = `أنت "Tutora"، مساعد ذكي ودود لطالب مصري في تانية باكالوريا. جاوب بالعربية المصري البسيط، في ٣-٤ جمل بس، من غير تنسيقات ولا نقط، عشان الإجابة ممكن تتقال بصوت عالي. جاوب على أي سؤال في أي موضوع بشكل مفيد وصادق، ولو السؤال في المنهج اشرح ببساطة من الأول.`;

const ASK_SYSTEM_EN = `You are "Tutora", a friendly smart assistant for a high-school student. Answer in simple clear English, in 3-4 sentences only, with no formatting or bullet points, because the answer may be spoken aloud. Answer any question on any topic helpfully and honestly, and if the question is about school material explain simply from the basics.`;

export async function askZekrly(history: ChatMessage[]): Promise<string> {
    const sys = uiLang === 'en' ? ASK_SYSTEM_EN : ASK_SYSTEM_AR;
    const text = await callAI([{ role: 'system', content: sys }, ...history.slice(-10)], false, 60000);
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
    return r;
}
