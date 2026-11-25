/* الصفحة الرئيسية: ستايل مودرن نضيف — شريط علوي، كرة NOVA في النص، تحية بالاسم،
   اقتراحات جاهزة، شريط كتابة سريع، أدوات، وآخر نشاط — مع خلفية حية هادئة */

import React, { useEffect, useState } from 'react';
import { Caption, Link } from './kit';
import { LiveBg } from './bits';
import { Icon } from './icons';
import { INTERESTS, fmt, t } from './i18n';
import { OrbView } from './orb3d';
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

export function Home({ onMenu }: { onMenu: () => void }) {
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

    const askQuick = (text: string) => {
        const q = text.trim();
        if (!q) return;
        setPendingAsk(q);
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

    const firstInterest = INTERESTS.find(it => interests.includes(it.id));

    return <>
        <div className="nv-topbar">
            <button type="button" className="nv-iconbtn" aria-label={t('nav.label')} onClick={onMenu}><Icon name="menu" size={20} /></button>
            <span className="nv-wordmark">NOVA</span>
            <button type="button" className="nv-iconbtn nv-bell" aria-label={t('home.notifs')} onClick={() => setShowNotifs(!showNotifs)}>
                <Icon name="bell" size={20} />
                {notices.length > 0 && <span className="nv-bell-dot">{notices.length}</span>}
            </button>
        </div>

        {showNotifs && <div className="nv-notif-panel" role="status">
            <span className="nv-notif-title">{t('home.notifs')}</span>
            {notices.length === 0 && <Caption>{t('home.noNotifs')}</Caption>}
            {notices.map((n, i) => <span key={i} className="nv-notif-item">{n}</span>)}
            {notifPerm === 'default' && <button type="button" className="nv-textbtn" onClick={enableNotifs}>{t('home.enableNotifs')}</button>}
            {notifPerm === 'granted' && <Caption>{t('home.notifOn')}</Caption>}
            {notifPerm === 'denied' && <Caption>{t('home.notifOff')}</Caption>}
            {notifPerm === 'unsupported' && <Caption>{t('home.notifUnsupported')}</Caption>}
        </div>}

        <div className="nv-hero">
            <LiveBg />
            <Link to="/ask" className="nv-hero-orb" aria-label={t('home.orbTitle')}>
                <OrbView state="idle" size="md" />
            </Link>
            <span className="nv-hero-hi">{fmt('home.hiName', { g: t(greetingKey()), n: name })}</span>
            <span className="nv-hero-title">{t('home.hero')}</span>
            {streakN > 0 && <span className="nv-streak"><Icon name="flame" size={15} /> {fmt('streak.line', { n: streakLabel(streakN) })}</span>}
        </div>

        <div className="nv-sugs">
            <button type="button" className="nv-sug" onClick={() => askQuick(t('home.sug.weather'))}>
                <Icon name="globe" size={16} /><span>{t('home.sug.weather')}</span>
            </button>
            <button type="button" className="nv-sug" onClick={() => askQuick(t('home.sug.lesson'))}>
                <Icon name="spark" size={16} /><span>{t('home.sug.lesson')}</span>
            </button>
            {firstInterest && <button type="button" className="nv-sug" onClick={() => { setPendingTopic(t(`topic.${firstInterest.id}`)); goTo('/quiz'); }}>
                <Icon name="quiz" size={16} /><span>{t('home.sug.quiz')}</span>
            </button>}
            <button type="button" className="nv-sug" onClick={() => goTo('/planner')}>
                <Icon name="calendar" size={16} /><span>{t('home.sug.plan')}</span>
            </button>
        </div>

        <div className="nv-inputbar">
            <input
                type="text"
                className="nv-input"
                placeholder={t('home.askPh')}
                value={quick}
                onChange={e => setQuick(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') askQuick(quick); }}
            />
            <button type="button" className="nv-sendbtn" aria-label={t('ask.send')} onClick={() => askQuick(quick)} disabled={quick.trim() === ''}>
                <Icon name="send" size={18} />
            </button>
        </div>

        <div className="nv-section">
            <span className="nv-section-title">{t('home.shortcuts')}</span>
            <div className="nv-tiles">
                <Link to="/quiz" className="nv-tile"><span className="nv-tile-ic"><Icon name="quiz" size={22} /></span><span>{t('nav.quiz')}</span></Link>
                <Link to="/planner" className="nv-tile"><span className="nv-tile-ic"><Icon name="calendar" size={22} /></span><span>{t('nav.planner')}</span></Link>
                <Link to="/ask" className="nv-tile"><span className="nv-tile-ic"><Icon name="chat" size={22} /></span><span>{t('nav.ask')}</span></Link>
                <Link to="/settings" className="nv-tile"><span className="nv-tile-ic"><Icon name="gear" size={22} /></span><span>{t('nav.settings')}</span></Link>
            </div>
        </div>

        {interests.length > 0 && <div className="nv-section">
            <span className="nv-section-title">{t('home.suggested')}</span>
            <div className="nv-chips">
                {INTERESTS.filter(it => interests.includes(it.id)).map(it => (
                    <button key={it.id} type="button" className="nv-chip" onClick={() => { setPendingTopic(t(`topic.${it.id}`)); goTo('/quiz'); }}>
                        <Icon name={it.ic} size={15} /><span>{t(`topic.${it.id}`)}</span>
                    </button>
                ))}
            </div>
        </div>}

        <div className="nv-section">
            <span className="nv-section-title">{t('home.recent')}</span>
            {activity.length === 0 && <Caption>{t('home.noRecent')}</Caption>}
            {activity.slice(0, 3).map((a, i) => (
                <div key={i} className="nv-activity">
                    <span className="nv-activity-dot" aria-hidden="true" />
                    <span>{a.text}</span>
                </div>
            ))}
        </div>

        <div className="nv-date-line"><Caption>{formatDate(today)}</Caption></div>
    </>;
}
