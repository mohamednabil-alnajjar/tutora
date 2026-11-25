/* NOVA — مساعدك الذكي في كل حاجة
   التطبيق كله بيشتغل على الجهاز (مفيش حسابات سحابية لسه)، والذكاء الاصطناعي بيتكلم خدمة مجانية مباشرة. */

import React, { useEffect, useState } from 'react';
import {
    Closing, FileCard, Link, NavLink, Route, Routes, useLocalState,
} from './kit';
import { Ask } from './ask';
import { setAiLang, startAmbient } from './ai';
import { Drawer, OfflineBanner, Splash } from './bits';
import { Home } from './home';
import { Icon } from './icons';
import { getLang, syncLang, t, useLang } from './i18n';
import { Onboarding } from './onboarding';
import { Planner } from './planner';
import { Quiz } from './quiz';
import { Settings } from './settings';
import { OrbView } from './orb3d';

export function App() {
    const [lang, setLang] = useLang();
    const [theme, setTheme] = useLocalState<string>('zakarely.theme.v1', 'light');
    const [onboard, setOnboard] = useLocalState<{ done: boolean }>('tutora.onboard.v1', { done: false });
    const [muted] = useLocalState<boolean>('zakarely.mute.v1', false);
    const [splashDone, setSplashDone] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    /* اللغة: تحديث اتجاه الصفحة ولغة المساعد */
    useEffect(() => {
        syncLang(lang);
        setAiLang(lang);
        try {
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        } catch { /* ignore */ }
    }, [lang]);

    /* الثيم الذكي: تلقائي حسب إعدادات الجهاز */
    useEffect(() => {
        const apply = () => {
            try {
                const dark = theme === 'dark' || (theme === 'auto' && 'matchMedia' in window && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            } catch { /* ignore */ }
        };
        apply();
        if (theme === 'auto' && 'matchMedia' in window) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = () => apply();
            if (mq.addEventListener) mq.addEventListener('change', onChange);
            return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); };
        }
        return undefined;
    }, [theme]);

    /* الموسيقى الهادئة: بتبدأ مع أول لمسة (قواعد التشغيل التلقائي في المتصفحات) */
    useEffect(() => {
        if (muted || !splashDone) return undefined;
        let started = false;
        const kick = () => {
            if (started) return;
            started = true;
            startAmbient();
        };
        window.addEventListener('pointerdown', kick);
        window.addEventListener('keydown', kick);
        return () => {
            window.removeEventListener('pointerdown', kick);
            window.removeEventListener('keydown', kick);
        };
    }, [muted, splashDone]);

    /* أول تشغيل: لو الحساب اتعمل من الأونبوردنج قبل كده، ميعادش يظهر */
    const needsOnboarding = !onboard.done;

    return <FileCard key={lang} lang={getLang()} dir={getLang() === 'ar' ? 'rtl' : 'ltr'}>
        {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
        {splashDone && needsOnboarding && (
            <Onboarding
                lang={lang}
                setLang={setLang}
                theme={theme}
                setTheme={setTheme}
                onDone={() => setOnboard({ done: true })}
            />
        )}
        {splashDone && !needsOnboarding && <>
            <Routes>
                <Route path="/" element={<Home onMenu={() => setDrawerOpen(true)} theme={theme} setTheme={setTheme} />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/ask" element={<Ask onMenu={() => setDrawerOpen(true)} />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/settings" element={<Settings lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />} />
            </Routes>
            <Closing>{t('app.closing')}</Closing>
            <nav className="zak-nav" aria-label={t('nav.label')}>
                <NavLink to="/" end><span className="zak-tab-ic"><Icon name="home" size={21} /></span><span>{t('nav.home')}</span></NavLink>
                <NavLink to="/quiz"><span className="zak-tab-ic"><Icon name="quiz" size={21} /></span><span>{t('nav.quiz')}</span></NavLink>
                <Link to="/ask" className="zak-nav-orb"><OrbView state="idle" size="sm" /></Link>
                <NavLink to="/planner"><span className="zak-tab-ic"><Icon name="calendar" size={21} /></span><span>{t('nav.planner')}</span></NavLink>
                <NavLink to="/settings"><span className="zak-tab-ic"><Icon name="gear" size={21} /></span><span>{t('nav.settings')}</span></NavLink>
            </nav>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <OfflineBanner />
        </>}
    </FileCard>;
}
