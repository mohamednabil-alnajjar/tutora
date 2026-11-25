/* الإعدادات: اللغة، المظهر (فاتح/ليلي/تلقائي)، الصوت، الحساب المحلي، الإشعارات، الصلاحيات والخصوصية، خارطة الطريق */

import React, { useEffect, useState } from 'react';
import { Callout, Caption, ChoiceRow, FileButton, Group, TextField, useLocalState } from './kit';
import { fmt, t } from './i18n';
import type { Lang } from './i18n';
import { ROADMAP_TEXT } from './roadmap';
import { hashPass, useAccount } from './util';

interface Props {
    lang: Lang;
    setLang: (l: Lang) => void;
    theme: string;
    setTheme: (v: string) => void;
}

function MicState() {
    const [mic, setMic] = useState('');
    useEffect(() => {
        const fallback = t('st.micAsk');
        try {
            const nav = navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
            if (!nav.permissions) { setMic(fallback); return; }
            nav.permissions.query({ name: 'microphone' })
                .then(r => setMic(r.state === 'granted' ? t('st.micGranted') : r.state === 'denied' ? t('st.micDenied') : t('st.micAsk')))
                .catch(() => setMic(fallback));
        } catch {
            setMic(fallback);
        }
    }, []);
    return <>{fmt('st.micLine', { s: mic })}</>;
}

function NotifRow() {
    const [state, setState] = useState('');
    useEffect(() => {
        try {
            if ('Notification' in window) setState(Notification.permission);
            else setState('unsupported');
        } catch {
            setState('unsupported');
        }
    }, []);
    const enable = () => {
        try {
            if (!('Notification' in window)) return;
            Notification.requestPermission().then(p => setState(p)).catch(() => undefined);
        } catch { /* ignore */ }
    };
    return <div className="zak-notif-row">
        {state === 'default' && <FileButton variant="secondary" onClick={enable}>{t('home.enableNotifs')}</FileButton>}
        {state === 'granted' && <Caption>{t('home.notifOn')}</Caption>}
        {state === 'denied' && <Caption>{t('home.notifOff')}</Caption>}
        {state === 'unsupported' && <Caption>{t('home.notifUnsupported')}</Caption>}
    </div>;
}

function AccountSection() {
    const [account, setAccount] = useAccount();
    const [mode, setMode] = useState<'view' | 'signin' | 'create'>('view');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [err, setErr] = useState('');

    const signOut = () => {
        setAccount({ mode: 'guest', name: account?.name ?? '' });
        setMode('view');
    };

    const signIn = () => {
        setErr('');
        if (!account || account.mode !== 'account' || !account.passHash) { setErr(t('st.noAcc')); return; }
        const emailOk = !account.email || account.email === email.trim();
        if (emailOk && hashPass(pass) === account.passHash) {
            setMode('view');
            setPass('');
        } else {
            setErr(t('st.wrongCred'));
        }
    };

    const create = () => {
        if (name.trim() === '') { setErr(t('ob.errName')); return; }
        if (pass.length < 4) { setErr(t('ob.errPass')); return; }
        setErr('');
        setAccount({ mode: 'account', name: name.trim(), email: email.trim() || undefined, passHash: hashPass(pass) });
        setMode('view');
        setName(''); setEmail(''); setPass('');
    };

    if (mode === 'signin') {
        return <div className="zak-form">
            <TextField label={t('ob.email')} value={email} onChange={setEmail} placeholder={t('ob.emailPh')} />
            <div>
                <span className="zak-field-label">{t('ob.pass')}</span>
                <input type="password" className="zak-input" value={pass} placeholder={t('ob.passPh')} onChange={e => setPass(e.target.value)} />
            </div>
            {err !== '' && <Caption>{err}</Caption>}
            <div className="zak-actions">
                <FileButton onClick={signIn}>{t('st.signIn')}</FileButton>
                <FileButton variant="secondary" onClick={() => { setMode('view'); setErr(''); }}>{t('ob.back')}</FileButton>
            </div>
        </div>;
    }

    if (mode === 'create') {
        return <div className="zak-form">
            <TextField label={t('ob.name')} value={name} onChange={setName} placeholder={t('ob.namePh')} />
            <TextField label={t('ob.email')} value={email} onChange={setEmail} placeholder={t('ob.emailPh')} />
            <div>
                <span className="zak-field-label">{t('ob.pass')}</span>
                <input type="password" className="zak-input" value={pass} placeholder={t('ob.passPh')} onChange={e => setPass(e.target.value)} />
            </div>
            {err !== '' && <Caption>{err}</Caption>}
            <div className="zak-actions">
                <FileButton onClick={create}>{t('st.makeAcc')}</FileButton>
                <FileButton variant="secondary" onClick={() => { setMode('view'); setErr(''); }}>{t('ob.back')}</FileButton>
            </div>
        </div>;
    }

    const signedIn = account?.mode === 'account';
    return <div className="zak-form">
        <Caption>{signedIn ? fmt('st.accLocal', { n: account?.name ?? '' }) : fmt('st.accGuest', { n: account?.name ? ` (${account.name})` : '' })}</Caption>
        <div className="zak-actions">
            {signedIn && <FileButton variant="secondary" onClick={signOut}>{t('st.signOut')}</FileButton>}
            {!signedIn && account?.passHash && <FileButton variant="secondary" onClick={() => setMode('signin')}>{t('st.signIn')}</FileButton>}
            {!signedIn && <FileButton variant="secondary" onClick={() => setMode('create')}>{t('st.makeAcc')}</FileButton>}
        </div>
        <Caption>{t('ob.localNote')}</Caption>
    </div>;
}

export function Settings({ lang, setLang, theme, setTheme }: Props) {
    const [muted, setMuted] = useLocalState<boolean>('zakarely.mute.v1', false);
    return <>
        <Group label={t('st.label')} heading={t('st.heading')}>
            <ChoiceRow
                label={t('st.lang')}
                options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]}
                value={lang}
                onChange={v => setLang(v as Lang)}
            />
            <ChoiceRow
                label={t('st.theme')}
                options={[
                    { value: 'light', label: t('ob.themeLight') },
                    { value: 'dark', label: t('ob.themeDark') },
                    { value: 'auto', label: t('ob.themeAuto') },
                ]}
                value={theme}
                onChange={setTheme}
            />
            <ChoiceRow
                label={t('st.sound')}
                options={[{ value: 'on', label: t('st.soundOn') }, { value: 'off', label: t('st.soundOff') }]}
                value={muted ? 'off' : 'on'}
                onChange={(v: string) => setMuted(v === 'off')}
            />
        </Group>
        <Group label={t('st.accH')} heading={t('st.accH')}>
            <AccountSection />
        </Group>
        <Group label={t('st.perms')} heading={t('st.privacyH')}>
            <Callout title={t('st.permsT')} tone="note">
                <MicState />
            </Callout>
            <Callout title={t('st.notifT')} tone="note">
                <NotifRow />
            </Callout>
            <Callout title={t('st.privacyH')} tone="note">
                {t('st.privacyBody')}
            </Callout>
            <details className="zak-roadmap">
                <summary>{t('st.roadmap')}</summary>
                <Caption>{ROADMAP_TEXT}</Caption>
            </details>
            <Caption>{t('st.credit')}</Caption>
        </Group>
    </>;
}
