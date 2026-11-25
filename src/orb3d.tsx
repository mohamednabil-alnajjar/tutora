/* كرة المساعد ثلاثية الأبعاد: WebGL shader حقيقي بحالات (هادئة/بتسمع/بتفكر/بتتكلم)،
   مع fallback تلقائي للكرة الـ CSS على الأجهزة اللي مفيهاش WebGL */

import React, { useEffect, useRef, useState } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/* فحص مرة واحدة: هل WebGL متاح؟ */
let webglOk: boolean | null = null;
function detectWebGL(): boolean {
    if (webglOk !== null) return webglOk;
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        webglOk = !!gl;
    } catch {
        webglOk = false;
    }
    return webglOk;
}

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = `
precision mediump float;
uniform float uTime;
uniform float uState;
uniform float uRes;

vec3 stateColor(float s) {
    vec3 idle = vec3(0.25, 0.62, 0.98);
    vec3 listen = vec3(0.30, 0.85, 0.85);
    vec3 think = vec3(0.30, 0.40, 0.95);
    vec3 speak = vec3(0.45, 0.50, 1.00);
    vec3 c = idle;
    c = mix(c, listen, step(0.5, s) * (1.0 - step(1.5, s)));
    c = mix(c, think, step(1.5, s) * (1.0 - step(2.5, s)));
    c = mix(c, speak, step(2.5, s));
    return c;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (uRes * 0.5);
    float r = length(uv);
    float speed = 0.6 + uState * 0.55;
    float t = uTime * speed;
    float plasma = sin(uv.x * 7.0 + t) + sin(uv.y * 8.0 - t * 1.3) + sin((uv.x + uv.y) * 5.0 + t * 0.7) + sin(r * 9.0 - t * 1.8);
    plasma *= 0.25;
    vec3 base = stateColor(uState);
    vec3 deep = mix(vec3(0.05, 0.18, 0.45), base * 0.40, 0.5);
    vec3 col = mix(deep, base, 0.5 + 0.5 * plasma);
    float fres = smoothstep(0.62, 1.0, r);
    col += base * fres * 0.85;
    vec2 hp = uv - vec2(-0.30, 0.32);
    col += vec3(1.0) * exp(-dot(hp, hp) * 22.0) * 0.85;
    float sphere = 1.0 - smoothstep(0.80, 0.86, r);
    float glow = exp(-max(r - 0.82, 0.0) * 5.5) * (0.55 + 0.20 * sin(uTime * (1.4 + uState)));
    col = col * sphere + base * glow * (1.0 - sphere);
    col += base * glow * sphere * 0.25;
    float alpha = max(sphere, min(glow * 1.6, 1.0));
    gl_FragColor = vec4(col, alpha);
}
`;

const STATE_NUM: Record<OrbState, number> = { idle: 0, listening: 1, thinking: 2, speaking: 3 };

function OrbGL({ state, px }: { state: OrbState; px: number }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) as WebGLRenderingContext | null;
        if (!gl) return undefined;
        let dead = false;

        const mk = (type: number, src: string) => {
            const sh = gl.createShader(type);
            if (!sh) return null;
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
        };
        const vs = mk(gl.VERTEX_SHADER, VERT);
        const fs = mk(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return undefined;
        const prog = gl.createProgram();
        if (!prog) return undefined;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined;
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'uTime');
        const uState = gl.getUniformLocation(prog, 'uState');
        const uRes = gl.getUniformLocation(prog, 'uRes');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, px, px);
        gl.uniform1f(uRes, px);

        const reduced = typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const start = performance.now();
        let raf = 0;
        const frame = () => {
            if (dead) return;
            if (!document.hidden) {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.uniform1f(uTime, reduced ? 1.0 : (performance.now() - start) / 1000);
                gl.uniform1f(uState, STATE_NUM[stateRef.current]);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { dead = true; cancelAnimationFrame(raf); };
    }, [px]);

    return <canvas ref={ref} width={px} height={px} className="zak-orbgl" style={{ width: px, height: px }} aria-hidden="true" />;
}

export function OrbView({ state, size }: { state: OrbState; size: 'lg' | 'md' | 'sm' }) {
    const [gl] = useState(() => detectWebGL());
    const px = size === 'lg' ? 150 : size === 'md' ? 110 : 52;
    if (gl) {
        return <span className={`zak-orbview zak-orbview-${size}`} data-state={state}>
            <OrbGL state={state} px={px} />
        </span>;
    }
    /* fallback: كرة CSS متحركة بنفس الحالات */
    return <span className={`zak-orb zak-orb-${size}`} data-state={state} aria-hidden="true">
        <span className="zak-orb-glow" />
        <span className="zak-orb-ball" />
        <span className="zak-orb-shine" />
    </span>;
}
