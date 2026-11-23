import type { Attempt } from '../storage/store';

export const MIN_ATTEMPTS = 10;
export const WEAKEST_COUNT = 3;

export interface AreaStat {
  paper: string;
  part: number;
  type: string;
  n: number;
  marks: number;
  maxMarks: number;
  /** 0..1 */
  accuracy: number;
  eligible: boolean;
}

export interface DayActivity {
  /** Local date, YYYY-MM-DD */
  date: string;
  attempts: number;
}

const isCorrect = (a: Attempt): boolean => a.marks >= a.maxMarks;

/** Accuracy per (paper, part, type) over all attempts; accuracy = sum(marks) / sum(maxMarks). */
export function areaStats(attempts: readonly Attempt[]): AreaStat[] {
  const groups = new Map<string, AreaStat>();
  for (const a of attempts) {
    const key = JSON.stringify([a.paper, a.part, a.type]);
    const g = groups.get(key) ?? { paper: a.paper, part: a.part, type: a.type, n: 0, marks: 0, maxMarks: 0, accuracy: 0, eligible: false };
    g.n += 1;
    g.marks += a.marks;
    g.maxMarks += a.maxMarks;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    accuracy: g.maxMarks > 0 ? g.marks / g.maxMarks : 0,
    eligible: g.n >= MIN_ATTEMPTS,
  }));
}

/** Lowest-accuracy eligible groups; ties go to the larger n, then to paper/part/type for a stable order. */
export function weakestAreas(attempts: readonly Attempt[], count = WEAKEST_COUNT): AreaStat[] {
  return areaStats(attempts)
    .filter((g) => g.eligible)
    .sort(
      (a, b) =>
        a.accuracy - b.accuracy ||
        b.n - a.n ||
        a.paper.localeCompare(b.paper) ||
        a.part - b.part ||
        a.type.localeCompare(b.type),
    )
    .slice(0, count);
}

/** Latest attempt per question, kept only when wrong. Result is newest first. */
export function errorLog(attempts: readonly Attempt[]): Attempt[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = latest.get(a.questionId);
    // `>=` so that on equal timestamps the later array entry wins
    if (!prev || Date.parse(a.at) >= Date.parse(prev.at)) latest.set(a.questionId, a);
  }
  return [...latest.values()].filter((a) => !isCorrect(a)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

const pad = (n: number): string => String(n).padStart(2, '0');
const localDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Attempts per local day for the 7 days ending on `now`'s day, oldest first. */
export function weekActivity(attempts: readonly Attempt[], now: Date): DayActivity[] {
  const days: DayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push({ date: localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)), attempts: 0 });
  }
  for (const a of attempts) {
    const day = days.find((d) => d.date === localDate(new Date(a.at)));
    if (day) day.attempts += 1;
  }
  return days;
}
