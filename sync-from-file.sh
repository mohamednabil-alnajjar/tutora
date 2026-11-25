#!/bin/bash
# بيجهز نسخة الـ PWA من سورس نسخة الملف (/downloads/zakarely) — المصدر الواحد للحقيقة
set -e
cd /downloads/zakarely-pwa

for f in App.tsx ai.ts ask.tsx bits.tsx home.tsx i18n.ts icons.tsx onboarding.tsx orb3d.tsx planner.tsx quiz.tsx roadmap.ts settings.tsx style.css util.ts; do
    cp "/downloads/zakarely/src/$f" "src/$f"
done
rm -rf src/data && cp -r /downloads/zakarely/src/data src/data
mkdir -p src/photos && cp /downloads/zakarely/src/photos/logo.png src/photos/

sed -i "s|from '@instinct/files'|from './kit'|" src/App.tsx src/ask.tsx src/bits.tsx src/home.tsx src/i18n.ts src/onboarding.tsx src/planner.tsx src/quiz.tsx src/settings.tsx src/util.ts
sed -i "s|import { Unit } from './types';|import type { Unit } from './types';|" src/data/index.ts src/data/unit*.ts

echo "synced"
