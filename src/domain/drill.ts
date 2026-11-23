import type { ContentSet, Rue1Set, Rue2Set, Rue3Set, Rue4Set, Rue5Set, Rue6Set, Rue7Set, Rue8Set } from '../content/types';
import type { Attempt, Session } from '../storage/store';
import { kwtScore, maxMarks, scoreLetter, scoreOpen } from './scoring';

export type Seg = { t: 'text'; value: string } | { t: 'gap'; n: number };

/** Split a gap text into paragraphs (blank line) of text and `[[n]]` gap segments. */
export function parseGapText(text: string): Seg[][] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const segs: Seg[] = [];
      let last = 0;
      for (const m of p.matchAll(/\[\[(\d+)\]\]/g)) {
        if (m.index > last) segs.push({ t: 'text', value: p.slice(last, m.index) });
        segs.push({ t: 'gap', n: Number(m[1]) });
        last = m.index + m[0].length;
      }
      if (last < p.length) segs.push({ t: 'text', value: p.slice(last) });
      return segs;
    });
}

export type GapSet = Rue1Set | Rue2Set | Rue3Set;
export type GapQuestion = GapSet['questions'][number];

/** Parts 1-3: gaps in a text. */
export const isGapSet = (s: ContentSet): s is GapSet => s.part === 1 || s.part === 2 || s.part === 3;

/** Parts 5, 6, 8: passages plus questions. */
export type ReadingSet = Rue5Set | Rue6Set | Rue8Set;

/** Every set that has a drill screen (all implemented parts). */
export type DrillSet = GapSet | Rue4Set | Rue7Set | ReadingSet;
export type DrillQuestion = GapQuestion | Rue4Set['items'][number] | Rue7Set['questions'][number] | ReadingSet['questions'][number];
export const isDrillSet = (s: ContentSet): s is DrillSet => s.paper === 'rue';
export const questionsOf = (s: DrillSet): DrillQuestion[] => (s.part === 4 ? s.items : s.questions);

/** Open answers can be self-marked. */
export const isOpen = (part: number): boolean => part === 2 || part === 3 || part === 4;

/** Enter in a text input must not submit the whole drill (only the submit button does). */
export const blocksImplicitSubmit = (key: string, tag: string, type?: string): boolean =>
  key === 'Enter' && tag === 'INPUT' && (type ?? 'text') === 'text';

export const scoreGap = (q: GapQuestion, given: string): 0 | 1 =>
  'answer' in q ? scoreLetter(given, q.answer) : scoreOpen(given, q.answers);

/** Marks for one answer: Parts 1-3 are 0/1, Part 4 (KWT) 0/1/2, Parts 5-7 are 2 per correct answer, Part 8 is 1. */
export function scoreAny(set: DrillSet, q: DrillQuestion, given: string): 0 | 1 | 2 {
  if (set.part === 4) return kwtScore(given, q as Rue4Set['items'][number]);
  if (set.part >= 5) return (scoreLetter(given, (q as { answer: string }).answer) * maxMarks(set.part)) as 0 | 1 | 2;
  return scoreGap(q as GapQuestion, given);
}

export const questionId = (setId: string, n: number): string => `${setId}#${n}`;

export function buildAttempts(
  set: DrillSet,
  answers: Record<number, string>,
  sessionId: string,
  at: string,
  only?: ReadonlySet<number>,
): Attempt[] {
  return questionsOf(set).filter((q) => !only || only.has(q.n)).map((q) => {
    const answer = answers[q.n] ?? '';
    return {
      id: `${sessionId}-${q.n}`,
      sessionId,
      questionId: questionId(set.id, q.n),
      setId: set.id,
      paper: set.paper,
      part: set.part,
      type: q.type,
      answer,
      marks: scoreAny(set, q, answer),
      maxMarks: maxMarks(set.part),
      at,
    };
  });
}

/** Rebuild the session totals from its attempts (used on submit and after self-marking). */
export function recomputeSession(session: Session, attempts: Attempt[]): Session {
  const mine = attempts.filter((a) => a.sessionId === session.id);
  const perPart: Session['perPart'] = {};
  for (const a of mine) {
    const p = (perPart[`${a.paper}:${a.part}`] ??= { marks: 0, maxMarks: 0 });
    p.marks += a.marks;
    p.maxMarks += a.maxMarks;
  }
  return {
    ...session,
    marks: mine.reduce((s, a) => s + a.marks, 0),
    maxMarks: mine.reduce((s, a) => s + a.maxMarks, 0),
    perPart,
  };
}

export const newSession = (set: { id: string }, id: string, at: string, kind: 'drill' | 'retry' | 'listening' | 'mock' = 'drill'): Session => ({
  id,
  kind,
  setIds: [set.id],
  startedAt: at,
  finishedAt: at,
  marks: 0,
  maxMarks: 0,
  perPart: {},
});

/** "I think this is correct": full marks, flagged so stats can show it. */
export const selfMarkAttempt = (a: Attempt): Attempt => ({ ...a, marks: a.maxMarks, selfMarked: true });

/** Whole days from `now` to the exam date (YYYY-MM-DD, local). Null if unset/invalid; negative if past. */
export function daysToExam(examDate: string | null, now: Date): number | null {
  const m = examDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate) : null;
  if (!m) return null;
  const exam = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exam - today) / 86_400_000);
}

/** Most recent score for a set, e.g. "7/8", or null. */
export function lastScore(sessions: Session[], setId: string): string | null {
  const s = sessions.filter((x) => x.kind !== 'mock' && x.setIds.includes(setId)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return s ? `${s.marks}/${s.maxMarks}` : null;
}

/** Handle a drill/listening screen gives to a host page (mini mock) that owns submitting. */
export interface Embedded {
  answers(): Record<number, string>;
  lock(): void;
}
