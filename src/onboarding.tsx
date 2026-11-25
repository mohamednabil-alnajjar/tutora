/* تدفق أول تشغيل: ترحيب → لغة ومظهر → اهتمامات → حساب محلي أو زائر → التعرف على المساعد (اختياري)
   قابل للتخطي بالكامل، وكل الاختيارات بتتحفظ على الجهاز وماتتكررش تاني */

import React, { useState } from 'react';
import { Caption, ChoiceRow, FileButton, TextField } from './kit';
import { askZekrly } from './ai';
import { Icon } from './icons';
import { INTERESTS, t } from './i18n';
import type { Lang } from './i18n';
import { OrbView } from './orb3d';
import { hashPass, useAccount, useInterests } from './util';

interface Props {
    lang: Lang;
    setLang: (l: Lang) => void;
    theme: string;
    setTheme: (v: string) => void;
    onDone: () => void;
}

const STEPS = 5;

export function Onboarding({ lang, setLang, theme, setTheme, onDone }: Props) {
    const [step, setStep] = useState(0);
    const [, setAccount] = useAccount();
    const [interests, setInterests] = useInterests();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [pass2, setPass2] = useState('');
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [reply, setReply] = useState('');
    const [busy, setBusy] = useState(false);

    const toggleInterest = (id: string) => {
        setInterests(interests.includes(id) ? interests.filter(x => x !== id) : [...interests, id]);
    };

    const createAccount = () => {
        if (name.trim() === '') { setErr(t('ob.errName')); return; }
        if (pass.length < 4) { setErr(t('ob.errPass')); return; }
        if (pass !== pass2) { setErr(t('ob.errMatch')); return; }
        setErr('');
        setAccount({ mode: 'account', name: name.trim(), email: email.trim() || undefined, passHash: hashPass(pass) });
        setStep(4);
    };

    const continueGuest = () => {
        setAccount({ mode: 'guest', name: name.trim() });
        setStep(4);
    };

    const askNow = async () => {
        const text = q.trim();
        if (!text || busy) return;
        setBusy(true);
        try {
            const r = await askZekrly([{ role: 'user', content: text }]);
            setReply(r);
        } catch {
            setReply(t('ask.err'));
        } finally {
            setBusy(false);
        }
    };

    return <div className="zak-onboard" role="dialog" aria-label={t('ob.welcomeT')}>
        <div className="zak-onboard-card">
            <div className="zak-onboard-progress" aria-hidden="true">
                {Array.from({ length: STEPS }, (_, i) => <span key={i} data-on={i <= step ? '1' : '0'} />)}
            </div>

            {step === 0 && <>
                <OrbView state="idle" size="lg" />
                <span className="zak-onboard-brand">NOVA</span>
                <h1 className="zak-onboard-title">{t('ob.welcomeT')}</h1>
                <p className="zak-onboard-sub">{t('ob.welcomeS')}</p>
            </>}

            {step === 1 && <>
                <h2 className="zak-onboard-h2">{t('ob.langThemeT')}</h2>
                <p className="zak-onboard-sub">{t('ob.langThemeS')}</p>
                <ChoiceRow
                    label={t('ob.lang')}
                    options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]}
                    value={lang}
                    onChange={v => setLang(v as Lang)}
                />
                <ChoiceRow
                    label={t('ob.theme')}
                    options={[
                        { value: 'light', label: t('ob.themeLight') },
                        { value: 'dark', label: t('ob.themeDark') },
                        { value: 'auto', label: t('ob.themeAuto') },
                    ]}
                    value={theme}
                    onChange={setTheme}
                />
            </>}

            {step === 2 && <>
                <h2 className="zak-onboard-h2">{t('ob.intT')}</h2>
                <p className="zak-onboard-sub">{t('ob.intS')}</p>
                <div className="nv-chips nv-chips-center">
                    {INTERESTS.map(it => (
                        <button key={it.id} type="button" className="nv-chip" data-on={interests.includes(it.id) ? '1' : '0'} onClick={() => toggleInterest(it.id)}>
                            <Icon name={it.ic} size={15} /><span>{t(`int.${it.id}`)}</span>
                        </button>
                    ))}
                </div>
            </>}

            {step === 3 && <>
                <h2 className="zak-onboard-h2">{t('ob.accT')}</h2>
                <p className="zak-onboard-sub">{t('ob.accS')}</p>
                <div className="zak-form">
                    <TextField label={t('ob.name')} value={name} onChange={setName} placeholder={t('ob.namePh')} />
                    <TextField label={t('ob.email')} value={email} onChange={setEmail} placeholder={t('ob.emailPh')} />
                    <div>
                        <span className="zak-field-label">{t('ob.pass')}</span>
                        <input type="password" className="zak-input" value={pass} placeholder={t('ob.passPh')} onChange={e => setPass(e.target.value)} />
                    </div>
                    <div>
                        <span className="zak-field-label">{t('ob.pass2')}</span>
                        <input type="password" className="zak-input" value={pass2} placeholder={t('ob.pass2Ph')} onChange={e => setPass2(e.target.value)} />
                    </div>
                    {err !== '' && <Caption>{err}</Caption>}
                    <FileButton onClick={createAccount}>{t('ob.create')}</FileButton>
                    <FileButton variant="secondary" onClick={continueGuest}>{t('ob.guest')}</FileButton>
                    <Caption>{t('ob.guestNote')}</Caption>
                    <Caption>{t('ob.localNote')}</Caption>
                </div>
            </>}

            {step === 4 && <>
                <OrbView state={busy ? 'thinking' : 'idle'} size="md" />
                <h2 className="zak-onboard-h2">{t('ob.meetT')}</h2>
                <p className="zak-onboard-sub">{t('ob.meetS')}</p>
                {reply !== '' && <div className="nv-msg nv-msg-ai zak-onboard-reply"><span className="nv-msg-text">{reply}</span></div>}
                <div className="nv-inputbar">
                    <input
                        type="text"
                        className="nv-input"
                        placeholder={t('ob.meetPh')}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void askNow(); }}
                        disabled={busy}
                    />
                    <button type="button" className="nv-sendbtn" aria-label={t('ob.send')} onClick={() => void askNow()} disabled={q.trim() === '' || busy}>
                        <Icon name="send" size={18} />
                    </button>
                </div>
            </>}

            <div className="zak-onboard-nav">
                {step > 0 && step < STEPS - 1 && <button type="button" className="zak-onboard-link" onClick={() => setStep(step - 1)}>{t('ob.back')}</button>}
                {step < STEPS - 1 && step !== 3 && <FileButton onClick={() => setStep(step + 1)}>{t('ob.next')}</FileButton>}
                {step === STEPS - 1 && <FileButton onClick={onDone}>{t('ob.done')}</FileButton>}
            </div>
            {step < STEPS - 1 && <button type="button" className="zak-onboard-link zak-onboard-skip" onClick={onDone}>{t('ob.skip')}</button>}
        </div>
    </div>;
}
