/* الصفحة الرئيسية الذكية المخصصة: تحية بالاسم حسب الوقت، كرة المساعد، سؤال سريع،
   اختصارات الأدوات، مواضيع مقترحة من الاهتمامات، آخر نشاط، وتنبيهات حقيقية من بيانات الجهاز */

import React, { useEffect, useState } from 'react';
import { Caption, Link } from './kit';
import { Orb } from './bits';
import { INTERESTS, fmt, t } from './i18n';
import { buildPlan } from './planner';
import type { Subject } from './planner';
import {
    formatDate, goTo, setPendingAsk, setPendingTopic, streakCount, streakLabel,
    todayISO, useAccount, useActivity, useInterests, useLocalStatePair, useStreak,
} from './util';

function greetingKey(): string {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'home.morning';
    if (h >= 12 && h < 18) return 'home.evening';
    return 'home.night';
}

export function Home() {
    const [account] = useAccount();
    const [streakData] = useStreak();
    const [interests] = useInterests();
    const [activity] = useActivity();
    const [subjects] = useLocalStatePair<Subject[]>('zakarely.planner.v2', []);
    const [done] = useLocalStatePair<Record<string, boolean>>('zakarely.done.v1', {});
    const [quick, setQuick] = useState('');
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifPerm, setNotifPerm] = useState('');

    const streakN = streakCount(streakData.days);
    const name = account?.name?.trim() || t('home.fallback');
    const today = todayISO();
    const todayPlan = buildPlan(subjects).find(d => d.iso === today);
    const pendingToday = todayPlan ? todayPlan.tasks.filter(x => !done[x.id]).length : 0;
    const studiedToday = streakData.days.includes(today);

    useEffect(() => {
        try {
            if ('Notification' in window) setNotifPerm(Notification.permission);
            else setNotifPerm('unsupported');
        } catch {
            setNotifPerm('unsupported');
        }
    }, []);

    const askQuick = () => {
        const text = quick.trim();
        if (!text) return;
        setPendingAsk(text);
        goTo('/ask');
    };

    const enableNotifs = () => {
        try {
            if (!('Notification' in window)) return;
            Notification.requestPermission().then(p => setNotifPerm(p)).catch(() => undefined);
        } catch { /* ignore */ }
    };

    const notices: string[] = [];
    if (streakN > 0 && !studiedToday) notices.push(t('home.streakRisk'));
    if (pendingToday > 0) notices.push(fmt('home.tasksToday', { n: pendingToday }));

    return <>
        <div className="zak-hero zak-hero-space">
            <div className="zak-hero-top">
                <div className="zak-hero-hi-wrap">
                    <span className="zak-hero-hi">{fmt('home.hiName', { g: t(greetingKey()), n: name })}</span>
                    <span className="zak-hero-sub">{t('home.ready')}</span>
                    {streakN > 0 && <span className="zak-streak">{fmt('streak.line', { n: streakLabel(streakN) })}</span>}
                </div>
                <button type="button" className="zak-bell" aria-label={t('home.notifs')} onClick={() => setShowNotifs(!showNotifs)}>
                    🔔{notices.length > 0 && <span className="zak-bell-dot">{notices.length}</span>}
                </button>
            </div>

            {showNotifs && <div className="zak-notif-panel" role="status">
                <span className="zak-notif-title">{t('home.notifs')}</span>
                {notices.length === 0 && <Caption>{t('home.noNotifs')}</Caption>}
                {notices.map((n, i) => <span key={i} className="zak-notif-item">{n}</span>)}
                {notifPerm === 'default' && <button type="button" className="zak-onboard-link" onClick={enableNotifs}>{t('home.enableNotifs')}</button>}
                {notifPerm === 'granted' && <Caption>{t('home.notifOn')}</Caption>}
                {notifPerm === 'denied' && <Caption>{t('home.notifOff')}</Caption>}
                {notifPerm === 'unsupported' && <Caption>{t('home.notifUnsupported')}</Caption>}
            </div>}

            <Link to="/ask" className="zak-orb-card">
                <Orb size="md" />
                <span className="zak-orb-card-text">
                    <b>{t('home.orbTitle')}</b>
                    <span>{t('home.orbSub')}</span>
                </span>
            </Link>

            <div className="zak-quick-ask">
                <input
                    type="text"
                    className="zak-chat-text"
                    placeholder={t('home.askPh')}
                    value={quick}
                    onChange={e => setQuick(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') askQuick(); }}
                />
                <button type="button" className="zak-quick-go" onClick={askQuick} disabled={quick.trim() === ''}>{t('home.askGo')}</button>
            </div>
        </div>

        <div className="zak-section">
            <span className="zak-section-title">{t('home.shortcuts')}</span>
            <div className="zak-tiles">
                <Link to="/quiz" className="zak-tile"><span className="zak-tile-ic">📝</span><span>{t('nav.quiz')}</span></Link>
                <Link to="/planner" className="zak-tile"><span className="zak-tile-ic">🗓️</span><span>{t('nav.planner')}</span></Link>
                <Link to="/ask" className="zak-tile"><span className="zak-tile-ic">💬</span><span>{t('nav.ask')} Tutora</span></Link>
                <Link to="/settings" className="zak-tile"><span className="zak-tile-ic">⚙️</span><span>{t('nav.settings')}</span></Link>
            </div>
        </div>

        {interests.length > 0 && <div className="zak-section">
            <span className="zak-section-title">{t('home.suggested')}</span>
            <div className="zak-chips">
                {INTERESTS.filter(it => interests.includes(it.id)).map(it => (
                    <button key={it.id} type="button" className="zak-chip" data-on="1" onClick={() => { setPendingTopic(t(`topic.${it.id}`)); goTo('/quiz'); }}>
                        <span aria-hidden="true">{it.ic}</span> {t(`topic.${it.id}`)}
                    </button>
                ))}
            </div>
        </div>}

        <div className="zak-section">
            <span className="zak-section-title">{t('home.recent')}</span>
            {activity.length === 0 && <Caption>{t('home.noRecent')}</Caption>}
            {activity.slice(0, 3).map((a, i) => (
                <div key={i} className="zak-activity">
                    <span className="zak-activity-dot" aria-hidden="true" />
                    <span>{a.text}</span>
                </div>
            ))}
        </div>

        <div className="zak-section zak-maker-line">
            <Caption>{t('home.maker')}</Caption>
            <Caption>{formatDate(today)}</Caption>
        </div>
    </>;
}
