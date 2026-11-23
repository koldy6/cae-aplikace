import type { ListeningSet } from '../content/types';
import type { Attempt, Session } from '../storage/store';
import { buildAttempts, newSession, questionsOf, recomputeSession, type DrillSet } from './drill';
import { buildListeningAttempts, listeningQuestions } from './listening';

/** Real exam: R&UoE 90 min for 56 questions = about 1.6 min (96 s) per question. Used for every part of the mini mock. */
export const SECONDS_PER_QUESTION = 96;
/** R&UoE parts in the mini mock (one set each) and the optional Listening part. */
export const MOCK_RUE_PARTS = [1, 2, 3, 4] as const;
export const MOCK_LISTENING_PART = 1;

export type MockItem = { paper: 'rue'; set: DrillSet } | { paper: 'listening'; set: ListeningSet };

/** Small deterministic PRNG (mulberry32) so tests can fix the selection. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One set: prefers sets the owner has not attempted, otherwise any; deterministic for a given seed. */
export function pickSet<T extends { id: string }>(sets: readonly T[], attempted: ReadonlySet<string>, seed: number): T | undefined {
  const fresh = sets.filter((s) => !attempted.has(s.id));
  const pool = fresh.length ? fresh : sets;
  return pool[Math.floor(rng(seed)() * pool.length)];
}

export interface MockPools {
  rue: (part: number) => DrillSet[];
  listening: (part: number) => ListeningSet[];
}

/** Parts without any set are skipped. */
export function selectMock(pools: MockPools, attemptedSetIds: ReadonlySet<string>, seed: number, withListening: boolean): MockItem[] {
  const items: MockItem[] = [];
  for (const p of MOCK_RUE_PARTS) {
    const set = pickSet(pools.rue(p), attemptedSetIds, seed + p);
    if (set) items.push({ paper: 'rue', set });
  }
  const l = withListening ? pickSet(pools.listening(MOCK_LISTENING_PART), attemptedSetIds, seed + 100) : undefined;
  if (l) items.push({ paper: 'listening', set: l });
  return items;
}

export const questionCount = (item: MockItem): number => (item.paper === 'rue' ? questionsOf(item.set).length : listeningQuestions(item.set).length);

export const budgetSeconds = (items: readonly MockItem[]): number => items.reduce((s, i) => s + questionCount(i), 0) * SECONDS_PER_QUESTION;

/** Dev override `?mockSeconds=20`: only a whole number of 1..5400 seconds, otherwise ignored. */
export function budgetOverride(search: string): number | null {
  const v = new URLSearchParams(search).get('mockSeconds');
  return v && /^\d{1,4}$/.test(v) && Number(v) >= 1 && Number(v) <= 5400 ? Number(v) : null;
}

export const shouldAutoSubmit = (now: number, deadline: number): boolean => now >= deadline;
export const remainingSeconds = (now: number, deadline: number): number => Math.max(0, Math.ceil((deadline - now) / 1000));
/** Screen reader announcements: every 5 minutes, then at 1 minute, 30 s and 10 s. Not every second. */
export const announceAt = (remaining: number): boolean => remaining > 0 && (remaining % 300 === 0 || remaining === 60 || remaining === 30 || remaining === 10);
export const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** `answers[i]` belongs to `items[i]`. Attempt ids stay unique across sets (all share the session id). */
export function buildMock(items: readonly MockItem[], answers: readonly Record<number, string>[], sid: string, at: string): { session: Session; attempts: Attempt[] } {
  const attempts = items.flatMap((it, i) =>
    (it.paper === 'rue' ? buildAttempts(it.set, answers[i] ?? {}, sid, at) : buildListeningAttempts(it.set, answers[i] ?? {}, sid, at)).map((a) => ({ ...a, id: `${sid}-${i}-${a.questionId}` })),
  );
  const base = newSession(items[0]!.set, sid, at, 'mock');
  return { session: recomputeSession({ ...base, setIds: items.map((i) => i.set.id) }, attempts), attempts };
}

export interface PartRow { paper: string; part: number; setId: string; marks: number; maxMarks: number }

/** Per-part breakdown in the order of the mock. */
export const partBreakdown = (items: readonly MockItem[], session: Session): PartRow[] =>
  items.map((i) => ({ paper: i.paper, part: i.set.part, setId: i.set.id, ...(session.perPart[`${i.paper}:${i.set.part}`] ?? { marks: 0, maxMarks: 0 }) }));
