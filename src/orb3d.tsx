/* كرة NOVA: نسخة CSS خالصة — خفيفة جداً على الموبايلات الضعيفة (لا WebGL، لا حلقات رسم).
   نفس الحالات (idle/listening/thinking/speaking) بألوان وحركة CSS فقط */

import React from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function OrbView({ state, size }: { state: OrbState; size: 'lg' | 'md' | 'sm' }) {
    return <span className={`zak-orb zak-orb-${size}`} data-state={state} aria-hidden="true">
        <span className="zak-orb-ring" />
        <span className="zak-orb-glow" />
        <span className="zak-orb-ball" />
        <span className="zak-orb-shine" />
    </span>;
}
