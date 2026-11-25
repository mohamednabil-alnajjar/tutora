/* أدوات مشتركة: تواريخ، سلسلة المذاكرة، النتايج، سجل النشاط، الحساب المحلي */

import { useLocalState } from './kit';
import { fmt, getLang, t } from './i18n';

export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function toISO(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function todayISO(): string {
    return toISO(new Date());
}

export function dayDiff(fromIso: string, toIsoDate: Date): number {
    const a = fromISO(fromIso);
    return Math.round((toIsoDate.getTime() - a.getTime()) / 86400000);
}

export function formatDate(iso: string): string {
    const d = fromISO(iso);
    if (getLang() === 'en') return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekdayName(iso: string): string {
    const i = fromISO(iso).getDay();
    return getLang() === 'en' ? WEEKDAYS_EN[i] : WEEKDAYS[i];
}

export function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* ---------- النتايج ---------- */

export interface Score { best: number; attempts: number; last: number }

export function useScores() {
    return useLocalState<Record<string, Score>>('zakarely.scores.v1', {});
}

/* ---------- سلسلة المذاكرة ---------- */

export function useStreak() {
    return useLocalState<{ days: string[] }>('zakarely.streak.v1', { days: [] });
}

export function markStreak(streak: { days: string[] }, setStreak: (v: { days: string[] }) => void, ready: boolean) {
    if (!ready) return;
    const t0 = todayISO();
    if (!streak.days.includes(t0)) setStreak({ days: [...streak.days, t0].slice(-60) });
}

export function streakCount(days: string[]): number {
    const set = new Set(days);
    let d = new Date();
    if (!set.has(toISO(d))) d = new Date(d.getTime() - 86400000);
    let n = 0;
    while (set.has(toISO(d))) { n++; d = new Date(d.getTime() - 86400000); }
    return n;
}

export function streakLabel(n: number): string {
    if (getLang() === 'en') return n === 1 ? '1 day' : `${n} days`;
    return n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوم`;
}

/* ---------- سجل النشاط ---------- */

export interface ActivityItem { ts: number; text: string }

export function useActivity(): [ActivityItem[], (text: string) => void] {
    const [items, setItems] = useLocalState<ActivityItem[]>('tutora.activity.v1', []);
    const push = (text: string) => {
        setItems(prev => [{ ts: Date.now(), text }, ...prev].slice(0, 20));
    };
    return [items, push];
}

/* ---------- الحساب المحلي (على الجهاز بس) ---------- */

export interface Account {
    mode: 'guest' | 'account';
    name: string;
    email?: string;
    passHash?: string;
}

export function useAccount() {
    return useLocalState<Account | null>('tutora.account.v1', null);
}

/* تجزئة بسيطة لكلمة السر — تخزين محلي على الجهاز بس، مش نظام أمان سحابي */
export function hashPass(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16);
}

/* ---------- الاهتمامات ---------- */

export function useInterests() {
    return useLocalState<string[]>('tutora.interests.v1', []);
}

/* ---------- تمرير سؤال/موضوع بين الصفحات ---------- */

let pendingAsk = '';
export function setPendingAsk(q: string): void { pendingAsk = q; }
export function consumePendingAsk(): string { const q = pendingAsk; pendingAsk = ''; return q; }

let pendingTopic = '';
export function setPendingTopic(q: string): void { pendingTopic = q; }
export function consumePendingTopic(): string { const q = pendingTopic; pendingTopic = ''; return q; }

/* ---------- التنقل ---------- */

export function goTo(path: string): void {
    window.location.hash = `#${path}`;
}

/* ---------- نص مستوى المادة (مخزن بالعربي) ---------- */

export function levelLabel(level: string): string {
    if (level === 'سهلة') return t('pl.easy');
    if (level === 'صعبة') return t('pl.hard');
    return t('pl.mid');
}

export { fmt, t };

/* قراءة/كتابة بسيطة لمفتاح تخزين محلي */
export function useLocalStatePair<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
    const [v, set] = useLocalState<T>(key, initial);
    return [v, set];
}
