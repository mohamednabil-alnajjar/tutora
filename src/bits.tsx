/* مكونات بصرية مشتركة: كرة المساعد المضيئة، شريط انقطاع النت، شاشة البداية السينمائية */

import React, { useEffect, useRef, useState } from 'react';
import { useLocalState } from './kit';
import { playChime, stopSpeaking } from './ai';
import { t } from './i18n';
import logoUrl from './photos/logo.png';

/* كرة الذكاء الاصطناعي — شكل المساعد المعتمد (CSS خالص، خفيف على البطارية) */
export function Orb({ size }: { size: 'lg' | 'md' | 'sm' }) {
    return <span className={`zak-orb zak-orb-${size}`} aria-hidden="true">
        <span className="zak-orb-glow" />
        <span className="zak-orb-ball" />
        <span className="zak-orb-shine" />
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

/* شاشة البداية السينمائية: خلفية فضائية داكنة، اللوجو في المنتصف، كرة مضيئة متحركة،
   ظهور اسم التطبيق بحركة، وانتقال سلس — قابلة للتخطي بالضغط */
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
        const t1 = setTimeout(() => setLeaving(true), 2500);
        const t2 = setTimeout(finish, 3100);
        return () => { clearTimeout(t1); clearTimeout(t2); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const skip = () => {
        if (leaving) return;
        setLeaving(true);
        setTimeout(finish, 450);
    };
    return <div className="zak-splash" data-leaving={leaving ? '1' : '0'} onClick={skip} role="button" aria-label="Tutora">
        <span className="zak-stars" aria-hidden="true" />
        <span className="zak-stars zak-stars-2" aria-hidden="true" />
        <button
            type="button"
            className="zak-splash-mute"
            aria-label={muted ? t('splash.muteOff') : t('splash.muteOn')}
            onClick={e => { e.stopPropagation(); setMuted(!muted); stopSpeaking(); }}
        >{muted ? '🔇' : '🔊'}</button>
        <div className="zak-splash-card">
            <Orb size="lg" />
            <img src={logoUrl} alt="Tutora" className="zak-splash-img" />
            <span className="zak-splash-logo">Tutora</span>
            <span className="zak-splash-credit">من تطوير محمد نبيل النجار</span>
            <span className="zak-splash-name">Mohamed Nabil Al-Najjar</span>
        </div>
    </div>;
}
