/* Tutora — مساعدك الذكي في كل المواد
   التطبيق كله بيشتغل على الجهاز (مفيش حسابات سحابية لسه)، والذكاء الاصطناعي بيتكلم خدمة مجانية مباشرة.
   من تطوير محمد نبيل النجار (Mohamed Nabil Al-Najjar) */

import React, { useEffect, useState } from 'react';
import {
    Closing, FileCard, Header, Link, NavLink, Route, Routes, useLocalState,
} from './kit';
import { Ask } from './ask';
import { OfflineBanner, Orb, Splash } from './bits';
import { Home } from './home';
import { setAiLang } from './ai';
import { getLang, syncLang, t, useLang } from './i18n';
import { Onboarding } from './onboarding';
import { Planner } from './planner';
import { Quiz } from './quiz';
import { Settings } from './settings';

export function App() {
    const [lang, setLang] = useLang();
    const [theme, setTheme] = useLocalState<string>('zakarely.theme.v1', 'auto');
    const [onboard, setOnboard] = useLocalState<{ done: boolean }>('tutora.onboard.v1', { done: false });
    const [splashDone, setSplashDone] = useState(false);

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

    /* أول تشغيل: لو الحساب اتعمل من الأونبوردنج قبل كده، ميعادش يظهر */
    const needsOnboarding = !onboard.done;

    return <FileCard lang={getLang()} dir={getLang() === 'ar' ? 'rtl' : 'ltr'}>
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
            <Header title="Tutora" fact={t('app.fact')} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/ask" element={<Ask />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/settings" element={<Settings lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />} />
            </Routes>
            <Closing>{t('app.closing')}</Closing>
            <nav className="zak-nav" aria-label={t('nav.label')}>
                <NavLink to="/" end><span className="zak-tab-ic">🏠</span><span>{t('nav.home')}</span></NavLink>
                <NavLink to="/quiz"><span className="zak-tab-ic">📝</span><span>{t('nav.quiz')}</span></NavLink>
                <Link to="/ask" className="zak-nav-orb"><Orb size="sm" /></Link>
                <NavLink to="/planner"><span className="zak-tab-ic">🗓️</span><span>{t('nav.planner')}</span></NavLink>
                <NavLink to="/settings"><span className="zak-tab-ic">⚙️</span><span>{t('nav.settings')}</span></NavLink>
            </nav>
            <OfflineBanner />
        </>}
    </FileCard>;
}
