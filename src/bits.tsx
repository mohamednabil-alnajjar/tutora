/* مكونات بصرية مشتركة: كرة المساعد، الخلفية الحية، الموسيقى الهادئة، القايمة الجانبية، شاشة البداية */

import React, { useEffect, useRef, useState } from 'react';
import { useLocalState } from './kit';
import { playChime, stopSpeaking } from './ai';
import { Icon } from './icons';
import type { IconName } from './icons';
import { t } from './i18n';
import { OrbView } from './orb3d';
import type { OrbState } from './orb3d';
import { goTo, startNewChat, useChatSessions } from './util';

/* كرة الذكاء الاصطناعي — fallback CSS خفيف (النسخة الأساسية WebGL في orb3d) */
export function Orb({ size, state = 'idle' }: { size: 'lg' | 'md' | 'sm'; state?: OrbState }) {
    return <span className={`zak-orb zak-orb-${size}`} data-state={state} aria-hidden="true">
        <span className="zak-orb-glow" />
        <span className="zak-orb-ball" />
        <span className="zak-orb-shine" />
    </span>;
}

/* خلفية حية: تدرجات لونية ناعمة بتتحرك ببطء — مودرن وخفيفة على البطارية */
export function LiveBg() {
    return <span className="nv-livebg" aria-hidden="true">
        <span className="nv-blob nv-blob-1" />
        <span className="nv-blob nv-blob-2" />
        <span className="nv-blob nv-blob-3" />
    </span>;
}

/* رسالة واضحة عند انقطاع الإنترنت مع إعادة محاولة */
export function OfflineBanner() {
    const [offline, setOffline] = useState(() => {
        try { return !navigator.onLine; } catch { return false; }
    });
    useEffect(() => {
        const off = () => setOffline(true);
        const on = () => setOffline(false);
        window.addEventListener('offline', off);
        window.addEventListener('online', on);
        return () => {
            window.removeEventListener('offline', off);
            window.removeEventListener('online', on);
        };
    }, []);
    if (!offline) return null;
    return <div className="zak-offline" role="alert">
        <span>{t('offline.msg')}</span>
        <button type="button" onClick={() => { try { if (navigator.onLine) setOffline(false); } catch { /* ignore */ } }}>
            {t('offline.retry')}
        </button>
    </div>;
}

/* شاشة البداية: مودرن وهادية — كرة NOVA في المنتصف، اسم التطبيق بحركة، قابلة للتخطي */
export function Splash({ onDone }: { onDone: () => void }) {
    const [muted, setMuted] = useLocalState<boolean>('zakarely.mute.v1', false);
    const [leaving, setLeaving] = useState(false);
    const fired = useRef(false);
    const finish = () => {
        if (fired.current) return;
        fired.current = true;
        onDone();
    };
    useEffect(() => {
        if (!muted) playChime();
        const t1 = setTimeout(() => setLeaving(true), 2400);
        const t2 = setTimeout(finish, 3000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const skip = () => {
        if (leaving) return;
        setLeaving(true);
        setTimeout(finish, 450);
    };
    return <div className="zak-splash" data-leaving={leaving ? '1' : '0'} onClick={skip} role="button" aria-label="NOVA">
        <LiveBg />
        <button
            type="button"
            className="zak-splash-mute"
            aria-label={muted ? t('splash.muteOff') : t('splash.muteOn')}
            onClick={e => { e.stopPropagation(); setMuted(!muted); stopSpeaking(); }}
        ><Icon name="volume" size={18} /></button>
        <div className="zak-splash-card">
            <OrbView state="idle" size="lg" />
            <span className="zak-splash-logo">NOVA</span>
            <span className="zak-splash-tag">{t('app.fact')}</span>
        </div>
    </div>;
}

/* القايمة الجانبية: محادثة جديدة، المحادثات المحفوظة، والأدوات — كلها شغالة */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [chats] = useChatSessions();
    if (!open) return null;
    const go = (path: string) => { onClose(); goTo(path); };
    const tool = (path: string, icon: IconName, label: string) => (
        <button key={path} type="button" className="nv-drawer-item" onClick={() => go(path)}>
            <span className="nv-drawer-ic"><Icon name={icon} size={19} /></span>
            <span>{label}</span>
        </button>
    );
    return <div className="nv-drawer-wrap" role="dialog" aria-label="NOVA">
        <button type="button" className="nv-drawer-backdrop" aria-label={t('ob.back')} onClick={onClose} />
        <aside className="nv-drawer">
            <div className="nv-drawer-head">
                <span className="nv-wordmark">NOVA</span>
                <button type="button" className="nv-iconbtn" aria-label={t('ob.back')} onClick={onClose}><Icon name="x" size={18} /></button>
            </div>
            <button type="button" className="nv-drawer-new" onClick={() => { startNewChat(); onClose(); goTo('/ask'); }}>
                <Icon name="edit" size={17} />
                <span>{t('dr.new')}</span>
            </button>
            <span className="nv-drawer-title">{t('dr.chats')}</span>
            <div className="nv-drawer-chats">
                {chats.length === 0 && <span className="nv-drawer-empty">{t('dr.empty')}</span>}
                {chats.slice(0, 12).map(c => (
                    <button key={c.id} type="button" className="nv-drawer-item nv-drawer-chat" onClick={() => { goTo(`/ask?c=${c.id}`); onClose(); }}>
                        <span className="nv-drawer-ic"><Icon name="chat" size={17} /></span>
                        <span className="nv-drawer-chat-title">{c.title}</span>
                    </button>
                ))}
            </div>
            <span className="nv-drawer-title">{t('dr.tools')}</span>
            {tool('/', 'home', t('nav.home'))}
            {tool('/quiz', 'quiz', t('nav.quiz'))}
            {tool('/planner', 'calendar', t('nav.planner'))}
            {tool('/settings', 'gear', t('nav.settings'))}
        </aside>
    </div>;
}
