import type { Unit } from './types';
import { unit1 } from './unit1';
import { unit2 } from './unit2';
import { unit3 } from './unit3';
import { unit4 } from './unit4';
import { unit5 } from './unit5';
import { unit6 } from './unit6';
import { unit7 } from './unit7';

export const units: Unit[] = [unit1, unit2, unit3, unit4, unit5, unit6, unit7];
export const totalQuestions = units.reduce((sum, u) => sum + u.questions.length, 0);
