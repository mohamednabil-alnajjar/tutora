#!/bin/bash
# بيجهز نسخة الـ PWA من سورس نسخة الملف (/downloads/zakarely) — المصدر الواحد للحقيقة
set -e
cd /downloads/zakarely-pwa

cp /downloads/zakarely/src/App.tsx src/App.tsx
cp /downloads/zakarely/src/ai.ts src/ai.ts
rm -rf src/data && cp -r /downloads/zakarely/src/data src/data
cp /downloads/zakarely/src/style.css src/style.css
mkdir -p src/photos && cp /downloads/zakarely/src/photos/logo.png src/photos/

sed -i "s|from '@instinct/files'|from './kit'|" src/App.tsx
sed -i "s|import { Unit } from './data/types';|import type { Unit } from './data/types';|" src/App.tsx
sed -i "s|import { Unit } from './types';|import type { Unit } from './types';|" src/data/index.ts src/data/unit*.ts

python3 - <<'PYEOF'
import io
p = 'src/App.tsx'
s = io.open(p, encoding='utf-8').read()

settings = '''
/* ---------- الإعدادات ---------- */

function Settings() {
    const [muted, setMuted] = useLocalState<boolean>('zakarely.mute.v1', false);
    const [theme, setTheme] = useLocalState<string>('zakarely.theme.v1', 'light');
    const [mic, setMic] = useState('...');
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);
    useEffect(() => {
        try {
            const nav = navigator as unknown as { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
            if (!nav.permissions) { setMic('هيتطلب إذنك أول ما تستخدمه'); return; }
            nav.permissions.query({ name: 'microphone' })
                .then(r => setMic(r.state === 'granted' ? 'متاح ✓' : r.state === 'denied' ? 'مرفوض — تقدر تسمح بيه من إعدادات المتصفح' : 'هيتطلب إذنك أول ما تستخدمه'))
                .catch(() => setMic('هيتطلب إذنك أول ما تستخدمه'));
        } catch {
            setMic('هيتطلب إذنك أول ما تستخدمه');
        }
    }, []);
    return <>
        <Group label="الإعدادات" heading="تحكم في Tutora">
            <ChoiceRow
                label="المظهر"
                options={[{ value: 'light', label: '☀️ فاتح' }, { value: 'dark', label: '🌙 ليلي' }]}
                value={theme}
                onChange={setTheme}
            />
            <ChoiceRow
                label="الصوت (نغمة الافتتاح وصوت المساعد)"
                options={[{ value: 'on', label: '🔊 شغال' }, { value: 'off', label: '🔇 ميوت' }]}
                value={muted ? 'off' : 'on'}
                onChange={(v: string) => setMuted(v === 'off')}
            />
        </Group>
        <Group label="الصلاحيات والخصوصية" heading="بياناتك ملكك">
            <Callout title="الصلاحيات" tone="note">
                المايكروفون: {mic}. أي صلاحية تقدر تلغيها في أي وقت من إعدادات المتصفح، وانت المتحكم دايمًا.
            </Callout>
            <Callout title="الخصوصية أولًا" tone="note">
                كل بياناتك (نتايجك وجدولك وإعداداتك) متخزنة على جهازك بس، مفيش حسابات ولا تتبع ولا بيع بيانات. نص سؤالك أو ملاحظاتك بس هو اللي بيتبعت لخدمة الذكاء الاصطناعي وقت الاستخدام عشان الرد.
            </Callout>
            <details className="zak-roadmap">
                <summary>🗺️ خارطة الطريق: كل اللي جاي في Tutora</summary>
                <Caption>{ROADMAP_TEXT}</Caption>
            </details>
            <Caption>Tutora — من تطوير محمد نبيل النجار (Mohamed Nabil Al-Najjar)</Caption>
        </Group>
    </>;
}

function Splash() {'''
assert 'function Splash() {' in s
s = s.replace('function Splash() {', settings, 1)

assert '</Routes>' in s
s = s.replace('</Routes>', '            <Route path="/settings" element={<Settings />} />\n        </Routes>', 1)

lines = s.split('\n')
for i, ln in enumerate(lines):
    if '<NavLink to="/planner"' in ln:
        indent = ln[:len(ln) - len(ln.lstrip())]
        lines.insert(i + 1, indent + '<NavLink to="/settings"><span className="zak-tab-ic">⚙️</span><span>الإعدادات</span></NavLink>')
        break
else:
    raise SystemExit('nav anchor not found')
s = '\n'.join(lines)

anchor = 'export function App() {'
assert anchor in s
s = s.replace(anchor, anchor + "\n    const [theme] = useLocalState<string>('zakarely.theme.v1', 'light');\n    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);", 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('pwa patches applied')
PYEOF

sed -i "s/const CACHE = '.*';/const CACHE = 'tutora-v2';/" public/sw.js
echo "sync done"
