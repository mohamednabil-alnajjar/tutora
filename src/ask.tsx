/* اسأل NOVA: محادثة حقيقية مع المساعد — بث مباشر للردود، وضع صوتي بالكرة المتحركة،
   طقس حقيقي، ملفات نصية، تفكير عميق، اقتراحات متابعة، وحفظ المحادثات على الجهاز */

import React, { useEffect, useRef, useState } from 'react';
import { Caption, Group, useLocalState } from './kit';
import {
    answerWeather, askZekrlyStream, createRecognizer, isWeatherQuery, speak, stopSpeaking, ttsSupported,
} from './ai';
import { Icon } from './icons';
import { fmt, t } from './i18n';
import { OrbView } from './orb3d';
import type { OrbState } from './orb3d';
import { consumeNewChatFlag, consumePendingAsk, goTo, setPendingTopic, useChatSessions } from './util';
import type { ChatMsgT } from './util';

export function Ask({ onMenu }: { onMenu: () => void }) {
    const [msgs, setMsgs] = useState<ChatMsgT[]>([]);
    const [chatId, setChatId] = useState<string>(() => `c${Date.now()}`);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [voiceMode, setVoiceMode] = useState(false);
    const [orbState, setOrbState] = useState<OrbState>('idle');
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [deep, setDeep] = useState(false);
    const [fileCtx, setFileCtx] = useState<{ name: string; text: string } | null>(null);
    const [fileNote, setFileNote] = useState('');
    const [recogAvailable] = useState(() => createRecognizer() !== null);
    const [chats, setChats] = useChatSessions();
    const [muted] = useLocalState<boolean>('zakarely.mute.v1', false);

    const busyRef = useRef(false);
    const voiceRef = useRef(false);
    const muteVoiceRef = useRef(false);
    const recogRef = useRef<ReturnType<typeof createRecognizer>>(null);
    const chatRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    voiceRef.current = voiceMode;
    muteVoiceRef.current = voiceMuted || muted;

    useEffect(() => () => { stopSpeaking(); try { recogRef.current?.abort(); } catch { /* ignore */ } }, []);

    /* حفظ المحادثة على الجهاز */
    useEffect(() => {
        if (msgs.length === 0) return;
        const title = msgs[0]?.text.slice(0, 40) || 'NOVA';
        const session = { id: chatId, ts: Date.now(), title, msgs };
        setChats(prev => [session, ...prev.filter(c => c.id !== chatId)].slice(0, 20));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [msgs, chatId]);

    /* فتح محادثة محفوظة من القايمة الجانبية (?c=ID) أو محادثة جديدة */
    useEffect(() => {
        try {
            const hash = window.location.hash;
            const m = hash.match(/[?&]c=([^&]+)/);
            if (m) {
                const found = chats.find(c => c.id === m[1]);
                if (found) {
                    setChatId(found.id);
                    setMsgs(found.msgs);
                }
            }
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (consumeNewChatFlag()) {
            setMsgs([]);
            setChatId(`c${Date.now()}`);
            setError('');
        }
    });

    /* تمرير لآخر رسالة */
    useEffect(() => {
        try {
            chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
        } catch { /* ignore */ }
    }, [msgs, busy]);

    const startListening = () => {
        const r = createRecognizer();
        if (!r || busyRef.current) return;
        recogRef.current = r;
        setOrbState('listening');
        r.onresult = e => {
            const said = e.results[0]?.[0]?.transcript ?? '';
            if (said.trim()) void send(said, true);
            else setOrbState(voiceRef.current ? 'listening' : 'idle');
        };
        r.onerror = () => setOrbState(voiceRef.current ? 'listening' : 'idle');
        r.onend = () => {
            /* لو وضع الصوت شغال ومفيش رد بيتجهز، ارجع اسمع */
            if (voiceRef.current && !busyRef.current && orbStateRef.current === 'listening') {
                try { r.start(); } catch { /* ignore */ }
            }
        };
        try { r.start(); } catch { setOrbState('idle'); }
    };

    const orbStateRef = useRef<OrbState>('idle');
    orbStateRef.current = orbState;

    const send = async (raw: string, byVoice = false) => {
        const text = raw.trim();
        if (!text || busyRef.current) return;
        busyRef.current = true;
        setError('');
        const ctxText = fileCtx ? `${text}\n\n[محتوى ملف ${fileCtx.name}]:\n${fileCtx.text}` : text;
        const next: ChatMsgT[] = [...msgs, { role: 'user', text }];
        setMsgs([...next, { role: 'assistant', text: '' }]);
        setInput('');
        setFileCtx(null);
        setBusy(true);
        setOrbState('thinking');
        try {
            stopSpeaking();
            let reply: string;
            if (isWeatherQuery(text)) {
                reply = await answerWeather(text);
                setMsgs([...next, { role: 'assistant', text: reply }]);
            } else {
                reply = await askZekrlyStream(
                    next.map(m => ({ role: m.role, content: m.text === text && m.role === 'user' ? ctxText : m.text })),
                    (full) => setMsgs([...next, { role: 'assistant', text: full }]),
                    deep,
                );
            }
            setOrbState('idle');
            const shouldSpeak = (byVoice || voiceRef.current) && !muteVoiceRef.current;
            if (shouldSpeak && ttsSupported) {
                setOrbState('speaking');
                speak(reply, () => {
                    setOrbState(prev => (prev === 'speaking' ? 'idle' : prev));
                    if (voiceRef.current && !muteVoiceRef.current) startListening();
                });
            } else if (voiceRef.current && !muteVoiceRef.current) {
                startListening();
            }
        } catch {
            setMsgs(next);
            setError(t('ask.err'));
            setOrbState('idle');
            if (voiceRef.current && !muteVoiceRef.current) startListening();
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    /* سؤال سريع جاي من الصفحة الرئيسية */
    useEffect(() => {
        const pending = consumePendingAsk();
        if (pending) void send(pending);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openVoiceMode = () => {
        if (!recogAvailable || !ttsSupported) return;
        setVoiceMode(true);
        startListening();
    };

    const closeVoiceMode = () => {
        setVoiceMode(false);
        setOrbState('idle');
        stopSpeaking();
        try { recogRef.current?.abort(); } catch { /* ignore */ }
    };

    const pickFile = (f: File | null) => {
        if (!f) return;
        if (f.size > 100 * 1024) { setFileNote(t('ask.fileTooBig')); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const txt = String(reader.result ?? '').slice(0, 8000);
            if (!txt.trim()) { setFileNote(t('ask.fileBad')); return; }
            setFileCtx({ name: f.name, text: txt });
            setFileNote(fmt('ask.fileAdded', { n: f.name }));
            setSheetOpen(false);
        };
        reader.onerror = () => setFileNote(t('ask.fileBad'));
        reader.readAsText(f);
    };

    const lastUserQ = [...msgs].reverse().find(m => m.role === 'user')?.text ?? '';
    const hasReply = msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && msgs[msgs.length - 1].text !== '' && !busy;

    const followUp = (kind: 'more' | 'example' | 'quiz') => {
        if (kind === 'quiz') {
            if (lastUserQ) setPendingTopic(lastUserQ);
            goTo('/quiz');
            return;
        }
        const prompt = kind === 'more'
            ? `اشرحلي أكتر عن: ${lastUserQ}`
            : `اديني مثال عملي على: ${lastUserQ}`;
        void send(prompt);
    };

    const stateText = orbState === 'listening' ? t('ask.listening')
        : orbState === 'thinking' ? t('ask.thinkingState')
        : orbState === 'speaking' ? t('ask.speaking') : t('ask.tapToStop');

    return <>
        <div className="nv-topbar">
            <button type="button" className="nv-iconbtn" aria-label={t('nav.label')} onClick={onMenu}><Icon name="menu" size={20} /></button>
            <span className="nv-wordmark">NOVA</span>
            <button type="button" className="nv-iconbtn" aria-label={t('dr.new')} onClick={() => { setMsgs([]); setChatId(`c${Date.now()}`); setError(''); }}><Icon name="edit" size={19} /></button>
        </div>

        <Group label={t('ask.label')} heading="">
            <div className="nv-chat" ref={chatRef} aria-live="polite">
                {msgs.length === 0 && <div className="nv-chat-empty">
                    <OrbView state="idle" size="md" />
                    <Caption>{t('ask.empty')}</Caption>
                    {!recogAvailable && <Caption>{t('ask.voiceUnsupported')}</Caption>}
                </div>}
                {msgs.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'nv-msg nv-msg-user' : 'nv-msg nv-msg-ai'}>
                        <span className="nv-msg-text">{m.text}{busy && i === msgs.length - 1 && m.role === 'assistant' ? <span className="nv-cursor" /> : null}</span>
                        {m.role === 'assistant' && m.text !== '' && ttsSupported && (
                            <button type="button" className="nv-msg-speak" aria-label={t('ask.listen')} onClick={() => speak(m.text)}><Icon name="volume" size={16} /></button>
                        )}
                    </div>
                ))}
                {busy && msgs[msgs.length - 1]?.role !== 'assistant' && <div className="nv-msg nv-msg-ai"><span className="nv-msg-text">{t('ask.thinking')}</span></div>}
            </div>

            {hasReply && <div className="nv-followups">
                <button type="button" className="nv-chip" onClick={() => followUp('more')}><Icon name="spark" size={14} /><span>{t('ask.more')}</span></button>
                <button type="button" className="nv-chip" onClick={() => followUp('example')}><Icon name="book" size={14} /><span>{t('ask.example')}</span></button>
                <button type="button" className="nv-chip" onClick={() => followUp('quiz')}><Icon name="quiz" size={14} /><span>{t('ask.quizMe')}</span></button>
            </div>}

            {fileNote !== '' && <Caption>{fileNote}</Caption>}
            {deep && <Caption>{t('ask.thinkOn')}</Caption>}

            <div className="nv-inputbar">
                <button type="button" className="nv-iconbtn" aria-label={t('ask.attach')} onClick={() => setSheetOpen(true)}><Icon name="plus" size={20} /></button>
                <input
                    type="text"
                    className="nv-input"
                    placeholder={t('ask.ph')}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void send(input); }}
                />
                {recogAvailable && !voiceMode && (
                    <button type="button" className="nv-iconbtn" aria-label={t('ask.mic')} onClick={startListening}><Icon name="mic" size={19} /></button>
                )}
                {input.trim() === '' ? (
                    <button type="button" className="nv-voicebtn" aria-label={t('ask.voiceMode')} onClick={openVoiceMode} disabled={!recogAvailable || !ttsSupported}>
                        <Icon name="wave" size={18} />
                    </button>
                ) : (
                    <button type="button" className="nv-sendbtn" aria-label={t('ask.send')} onClick={() => void send(input)} disabled={busy}>
                        <Icon name="send" size={18} />
                    </button>
                )}
            </div>
            {error !== '' && <Caption>{error}</Caption>}
            <Caption>{t('ask.note')}</Caption>
        </Group>

        {sheetOpen && <div className="nv-sheet-wrap" role="dialog" aria-label={t('ask.attach')}>
            <button type="button" className="nv-sheet-backdrop" aria-label={t('ob.back')} onClick={() => setSheetOpen(false)} />
            <div className="nv-sheet">
                <button type="button" className="nv-sheet-item" onClick={() => fileInputRef.current?.click()}>
                    <span className="nv-sheet-ic"><Icon name="file" size={20} /></span>
                    <span className="nv-sheet-text"><b>{t('ask.attachFile')}</b><span>{t('ask.attachFileNote')}</span></span>
                </button>
                <button type="button" className="nv-sheet-item" data-on={deep ? '1' : '0'} onClick={() => { setDeep(!deep); setSheetOpen(false); }}>
                    <span className="nv-sheet-ic"><Icon name="think" size={20} /></span>
                    <span className="nv-sheet-text"><b>{t('ask.think')}</b><span>{t('ask.thinkOn')}</span></span>
                </button>
            </div>
        </div>}
        <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,text/plain"
            style={{ display: 'none' }}
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
        />

        {voiceMode && <div className="nv-voice" role="dialog" aria-label={t('ask.voiceMode')}>
            <div className="nv-voice-top">
                <button type="button" className="nv-iconbtn nv-voice-x" aria-label={t('ask.voiceExit')} onClick={closeVoiceMode}><Icon name="x" size={20} /></button>
                <span className="nv-voice-title">{t('ask.voiceMode')}</span>
                <button
                    type="button"
                    className="nv-iconbtn"
                    aria-label={voiceMuted ? t('ask.voiceUnmute') : t('ask.voiceMute')}
                    onClick={() => { setVoiceMuted(!voiceMuted); if (!voiceMuted) stopSpeaking(); }}
                ><Icon name={voiceMuted ? 'stop' : 'volume'} size={19} /></button>
            </div>
            <div className="nv-voice-orb">
                <OrbView state={orbState} size="lg" />
            </div>
            <span className="nv-voice-state">{stateText}</span>
            <div className="nv-voice-bar">
                <input
                    type="text"
                    className="nv-input"
                    placeholder={t('ask.ph')}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void send(input, true); }}
                />
                <button type="button" className="nv-sendbtn" aria-label={t('ask.send')} onClick={() => void send(input, true)} disabled={input.trim() === '' || busy}>
                    <Icon name="send" size={18} />
                </button>
            </div>
        </div>}
    </>;
}
