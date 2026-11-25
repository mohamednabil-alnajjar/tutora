/* أيقونات SVG احترافية (خطية، بأسلوب الأيقونات الحديثة) — بديل الأيموجي في كل الواجهة */

import React from 'react';

export type IconName =
    | 'home' | 'quiz' | 'chat' | 'calendar' | 'gear' | 'bell' | 'mic' | 'stop'
    | 'send' | 'wave' | 'plus' | 'file' | 'spark' | 'globe' | 'flame' | 'sun'
    | 'moon' | 'check' | 'trash' | 'user' | 'x' | 'menu' | 'edit' | 'search'
    | 'book' | 'briefcase' | 'code' | 'divide' | 'flask' | 'palette' | 'clock'
    | 'think' | 'volume' | 'chevDown' | 'image' | 'chevL';

const PATHS: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
    quiz: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 11h6" /><path d="M9 15h4" /></>,
    chat: <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" /></>,
    bell: <><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    send: <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
    wave: <><path d="M4 10v4" /><path d="M8 7v10" /><path d="M12 4v16" /><path d="M16 7v10" /><path d="M20 10v4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
    spark: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" /></>,
    flame: <path d="M12 22c4.4 0 7-2.8 7-6.5 0-4-3-6.5-4.5-9C13.5 8.5 13 10 11.5 11c-.5-2-2-3.5-3-4.5C8 9 5 11.5 5 15.5 5 19.2 7.6 22 12 22z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></>,
    moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
    check: <path d="m4.5 12.5 5 5 10-11" />,
    trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" /></>,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h10" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4-4" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5V5.5" /><path d="M20 18v3H6.5" /></>,
    briefcase: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>,
    code: <><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m13.5 5-3 14" /></>,
    divide: <><circle cx="12" cy="6" r="1" /><path d="M5 12h14" /><circle cx="12" cy="18" r="1" /></>,
    flask: <><path d="M10 3h4" /><path d="M10 3v5l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 8V3" /><path d="M8 15h8" /></>,
    palette: <><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="15.5" cy="10" r="1" /><path d="M12 21c-1 0-1.5-.8-1.5-1.7 0-1.2 1-1.8 1-3.3 0-1.5 1.2-2.5 2.7-2.5H16a5 5 0 0 1 5 5c0 1.5-1.5 2.5-3.5 2.5z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    think: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.8a2.5 2.5 0 1 1 3.4 2.3c-.7.3-.9.8-.9 1.4v.5" /><path d="M12 17h.01" /></>,
    volume: <><path d="M11 5 6.5 8.5H3v7h3.5L11 19z" /><path d="M15 9a4.5 4.5 0 0 1 0 6" /><path d="M17.5 6.5a8 8 0 0 1 0 11" /></>,
    chevDown: <path d="m6 9 6 6 6-6" />,
    chevL: <path d="m15 6-6 6 6 6" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 18 5-5 3.5 3.5 3-3L20.5 18" /></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
    return <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >{PATHS[name]}</svg>;
}
