import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './kit.css';
import './style.css';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
            /* لو فيه تحديث مستني، فعّله فورًا */
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        nw.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
            /* افحص التحديثات كل ما التطبيق يرجع للمقدمة */
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update().catch(() => undefined);
            });
        }).catch(() => { /* offline support unavailable */ });
    });

    /* أول ما نسخة جديدة تمسك الصفحة، اعمل ريلود مرة واحدة عشان التحديث يظهر */
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
    });
}
