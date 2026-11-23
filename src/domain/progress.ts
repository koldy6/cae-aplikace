import type { Attempt, Session } from '../storage/store';
import type { AreaStat } from './weakAreas';
import type { DrillQuestion, DrillSet } from './drill';

export interface RetryGroup {
  setId: string;
  /** Question numbers still in the error log, ascending. */
  ns: number[];
}

/** "set-id#3" -> 3 (null if malformed). */
export function questionNumber(questionId: string): number | null {
  const m = /#(\d+)$/.exec(questionId);
  return m ? Number(m[1]) : null;
}

/** Group error-log attempts by set, in order of first appearance (newest error first). */
export function retryGroups(errors: readonly Attempt[]): RetryGroup[] {
  const groups = new Map<string, RetryGroup>();
  for (const a of errors) {
    const n = questionNumber(a.questionId);
    if (n === null) continue;
    const g = groups.get(a.setId) ?? { setId: a.setId, ns: [] };
    if (!g.ns.includes(n)) g.ns.push(n);
    groups.set(a.setId, g);
  }
  return [...groups.values()].map((g) => ({ ...g, ns: g.ns.sort((x, y) => x - y) }));
}

const pct = (x: number): number => Math.round(x * 100);

/** "Part 3 word formation: 55 %" (type tags use dashes; shown with spaces). */
export const formatArea = (s: Pick<AreaStat, 'part' | 'type' | 'accuracy'>): string =>
  `Part ${s.part} ${s.type.replace(/-/g, ' ')}: ${pct(s.accuracy)} %`;

/** Width class for .meter__bar, rounded to the nearest 5 %. */
export const meterClass = (accuracy: number): string =>
  `w-${Math.min(100, Math.max(0, Math.round((accuracy * 100) / 5) * 5))}`;

export const percentText = (accuracy: number): string => `${pct(accuracy)} %`;

export interface PartStat {
  paper: string;
  part: number;
  n: number;
  accuracy: number;
}

/** Accuracy per (paper, part) over all attempts, ordered by paper then part. */
export function partStats(attempts: readonly Attempt[]): PartStat[] {
  const m = new Map<string, { paper: string; part: number; n: number; marks: number; max: number }>();
  for (const a of attempts) {
    const k = `${a.paper}:${a.part}`;
    const g = m.get(k) ?? { paper: a.paper, part: a.part, n: 0, marks: 0, max: 0 };
    g.n += 1;
    g.marks += a.marks;
    g.max += a.maxMarks;
    m.set(k, g);
  }
  return [...m.values()]
    .map((g) => ({ paper: g.paper, part: g.part, n: g.n, accuracy: g.max > 0 ? g.marks / g.max : 0 }))
    .sort((a, b) => a.paper.localeCompare(b.paper) || a.part - b.part);
}

/** Newest first. */
export const sessionsNewestFirst = (sessions: readonly Session[]): Session[] =>
  [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

/** Short correct-answer text shown for read-only gaps in a retry drill. */
export function correctShort(set: DrillSet, q: DrillQuestion): string {
  const x = q as { answer?: string; answers?: string[]; options?: Record<string, string>; fullAnswers?: string[] };
  if (set.part >= 6) return x.answer ?? '';
  if (x.options && x.answer) return x.options[x.answer] ?? x.answer;
  return x.answers?.[0] ?? x.fullAnswers?.[0] ?? '';
}
