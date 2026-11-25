/* اسأل Tutora: محادثة مع المساعد الذكي بالكتابة أو بالصوت، مع كرة المساعد في الرأس */

import React, { useEffect, useRef, useState } from 'react';
import { Caption, FileButton, Group } from './kit';
import { askZekrly, createRecognizer, speak, stopSpeaking, ttsSupported } from './ai';
import { Orb } from './bits';
import { t } from './i18n';
import { consumePendingAsk } from './util';

interface ChatMsg { role: 'user' | 'assistant'; text: string }

export function Ask() {
    const [msgs, setMsgs] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [listening, setListening] = useState(false);
    const [recogAvailable] = useState(() => createRecognizer() !== null);
    const busyRef = useRef(false);

    useEffect(() => () => stopSpeaking(), []);

    const send = async (raw: string, byVoice = false) => {
        const text = raw.trim();
        if (!text || busyRef.current) return;
        busyRef.current = true;
        const next: ChatMsg[] = [...msgs, { role: 'user', text }];
        setMsgs(next);
        setInput('');
        setBusy(true);
        setError('');
        try {
            const reply = await askZekrly(next.map(m => ({ role: m.role, content: m.text })));
            setMsgs([...next, { role: 'assistant', text: reply }]);
            if (byVoice) speak(reply);
        } catch {
            setError(t('ask.err'));
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    /* سؤال سريع جاي من الصفحة الرئيسية */
    useEffect(() => {
        const pending = consumePendingAsk();
        if (pending) send(pending);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startListening = () => {
        const r = createRecognizer();
        if (!r || listening || busy) return;
        setListening(true);
        r.onresult = e => {
            const said = e.results[0]?.[0]?.transcript ?? '';
            setListening(false);
            if (said.trim()) send(said, true);
        };
        r.onerror = () => setListening(false);
        r.onend = () => setListening(false);
        try { r.start(); } catch { setListening(false); }
    };

    return <>
        <Group label={t('ask.label')} heading={t('ask.heading')}>
            <div className="zak-ask-head">
                <Orb size="sm" />
            </div>
            <div className="zak-chat" aria-live="polite">
                {msgs.length === 0 && <Caption>{t('ask.empty')}</Caption>}
                {msgs.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'zak-msg zak-msg-user' : 'zak-msg zak-msg-ai'}>
                        <span className="zak-msg-text">{m.text}</span>
                        {m.role === 'assistant' && ttsSupported && (
                            <button type="button" className="zak-msg-speak" aria-label={t('ask.listen')} onClick={() => speak(m.text)}>🔊</button>
                        )}
                    </div>
                ))}
                {busy && <div className="zak-msg zak-msg-ai"><span className="zak-msg-text">{t('ask.thinking')}</span></div>}
            </div>
            <div className="zak-chat-input">
                {recogAvailable && (
                    <button type="button" className="zak-mic" data-on={listening ? '1' : '0'} onClick={startListening} aria-label={t('ask.mic')}>
                        {listening ? '⏹' : '🎙️'}
                    </button>
                )}
                <input
                    type="text"
                    className="zak-chat-text"
                    placeholder={t('ask.ph')}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                    disabled={busy}
                />
                <FileButton onClick={() => send(input)} disabled={input.trim() === '' || busy}>{t('ask.send')}</FileButton>
            </div>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>{t('ask.note')}</Caption>
        </Group>
    </>;
}
