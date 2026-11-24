import React, { useEffect, useState } from 'react';

/* ---------- mini hash router (replaces the File kit router) ---------- */

function useHashPath(): string {
    const [path, setPath] = useState(() => window.location.hash.replace(/^#/, '') || '/');
    useEffect(() => {
        const on = () => setPath(window.location.hash.replace(/^#/, '') || '/');
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);
    return path;
}

export function Routes({ children }: { children: React.ReactNode }) {
    const path = useHashPath();
    let match: React.ReactElement | null = null;
    let fallback: React.ReactElement | null = null;
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;
        const p = (child.props as { path?: string }).path;
        if (p === path && !match) match = child;
        if (p === '/' && !fallback) fallback = child;
    });
    const picked = (match ?? fallback) as React.ReactElement | null;
    return <>{picked ? (picked.props as { element?: React.ReactNode }).element : null}</>;
}

export function Route(_props: { path: string; element: React.ReactNode }) {
    return null;
}

export function Link({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
    return <a href={`#${to}`} className={className}>{children}</a>;
}

export function NavLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
    const path = useHashPath();
    const active = end ? path === to : path === to || path.startsWith(`${to}/`);
    return <a href={`#${to}`} className={active ? 'k-navlink k-navlink-active' : 'k-navlink'}>{children}</a>;
}

/* ---------- persistent state (localStorage, same keys as the File version) ---------- */

export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, { ready: boolean; message: string }] {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw != null) return JSON.parse(raw) as T;
        } catch { /* ignore */ }
        return initial;
    });
    const set = (v: T | ((p: T) => T)) => {
        setValue((prev) => {
            const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
            try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    };
    return [value, set, { ready: true, message: '' }];
}

/* ---------- layout components ---------- */

export function FileCard({ lang, dir, children }: { lang?: string; dir?: string; children: React.ReactNode }) {
    return <div className="k-card" lang={lang} dir={dir as 'rtl' | 'ltr' | undefined}>{children}</div>;
}

export function Header({ title, fact, intro }: { title: string; fact?: string; intro?: string }) {
    return (
        <header className="k-header">
            <h1>{title}</h1>
            {fact && <div className="k-fact">{fact}</div>}
            {intro && <p className="k-intro">{intro}</p>}
        </header>
    );
}

export function Group({ label, heading, children }: { label?: string; heading?: string; children: React.ReactNode }) {
    return (
        <section className="k-group">
            {label && <span className="k-label">{label}</span>}
            {heading && <h2>{heading}</h2>}
            {children}
        </section>
    );
}

export function Callout({ title, tone, children }: { title?: string; tone?: string; children: React.ReactNode }) {
    return (
        <div className={`k-callout k-callout-${tone ?? 'note'}`}>
            {title && <strong>{title}</strong>}
            <div>{children}</div>
        </div>
    );
}

export function Caption({ children }: { children: React.ReactNode }) {
    return <p className="k-caption">{children}</p>;
}

export function Closing({ children }: { children: React.ReactNode }) {
    return <footer className="k-closing">{children}</footer>;
}

/* ---------- inputs ---------- */

interface ChoiceOption { value: string; label: string }

export function ChoiceRow({ label, options, value, onChange }: { label?: string; options: ChoiceOption[]; value: string; onChange: (v: string) => void }) {
    return (
        <div className="k-choice">
            {label && <span className="k-choice-label">{label}</span>}
            <div className="k-choice-row">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        className={o.value === value ? 'k-opt k-opt-active' : 'k-opt'}
                        onClick={() => onChange(o.value)}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function FileButton({ variant, disabled, onClick, children }: { variant?: string; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            className={variant === 'secondary' ? 'k-btn k-btn-secondary' : 'k-btn'}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

export function TextField({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <label className="k-field">
            {label && <span>{label}</span>}
            <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        </label>
    );
}
