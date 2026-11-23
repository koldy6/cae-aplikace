import type { ListeningSet } from '../content/types';
import type { Segment } from '../media/tts';
import type { Attempt } from '../storage/store';
import { questionId } from './drill';
import { maxMarks, scoreLetter, scoreOpen } from './scoring';

/** One answerable item, whatever the part. Part 4 has 10: task 1 = 1..5, task 2 = 6..10 (speaker k, task t -> (t-1)*5+k). */
export interface LQ {
  n: number;
  type: string;
  explanation: { en: string; cs: string };
  /** Accepted answers; a single letter when `options` is set. */
  keys: string[];
  options?: Record<string, string>;
  label: string;
}

export function listeningQuestions(set: ListeningSet): LQ[] {
  if (set.part === 1)
    return set.extracts.flatMap((e) => e.questions).map((q) => ({ n: q.n, type: q.type, explanation: q.explanation, keys: [q.answer], options: q.options, label: `Question ${q.n}` }));
  if (set.part === 2) return set.questions.map((q) => ({ n: q.n, type: q.type, explanation: q.explanation, keys: q.answers, label: `Gap ${q.n}` }));
  if (set.part === 3)
    return set.questions.map((q) => ({ n: q.n, type: q.type, explanation: q.explanation, keys: [q.answer], options: q.options, label: `Question ${q.n}` }));
  return ([1, 2] as const).flatMap((t) =>
    set.speakers.map((_, i) => ({
      n: (t - 1) * 5 + i + 1,
      type: set[`task${t}`].type,
      explanation: set[`explanations${t}`][i]!,
      keys: [set[`answers${t}`][i]!],
      options: set[`task${t}`].options as Record<string, string>,
      label: `Speaker ${i + 1}, task ${t}`,
    })),
  );
}

/** Listening is always 1 mark per question. */
export const scoreListening = (q: LQ, given: string): 0 | 1 => (q.options ? scoreLetter(given, q.keys[0]!) : scoreOpen(given, q.keys));

export const correctListening = (q: LQ): string => (q.options ? `${q.keys[0]} – ${q.options[q.keys[0]!]}` : q.keys.join(' / '));
export const givenListening = (q: LQ, given: string): string => (!given ? '(bez odpovědi)' : q.options ? `${given} – ${q.options[given] ?? ''}` : given);

export function buildListeningAttempts(set: ListeningSet, answers: Record<number, string>, sessionId: string, at: string, only?: ReadonlySet<number>): Attempt[] {
  return listeningQuestions(set).filter((q) => !only || only.has(q.n)).map((q) => {
    const answer = answers[q.n] ?? '';
    return {
      id: `${sessionId}-${q.n}`, sessionId, questionId: questionId(set.id, q.n), setId: set.id,
      paper: 'listening', part: set.part, type: q.type, answer,
      marks: scoreListening(q, answer), maxMarks: maxMarks(set.part, 'listening'), at,
    };
  });
}

/** Audio units, each with its own play counter: Part 1 = one per extract, Part 4 = all five speakers in sequence (as in the exam). */
export function playUnits(set: ListeningSet): { title: string; segments: Segment[] }[] {
  if (set.part === 1) return set.extracts.map((e, i) => ({ title: `Extract ${i + 1}`, segments: e.segments }));
  if (set.part === 4)
    return [{ title: 'Speakers 1–5', segments: set.speakers.flatMap((s, i) => [{ speaker: 'N' as const, text: `Speaker ${i + 1}.` }, ...s.segments]) }];
  return [{ title: 'Recording', segments: set.segments }];
}

/** Script shown as text (fallback and after submit). */
export function scriptGroups(set: ListeningSet): { title: string; segments: Segment[] }[] {
  if (set.part === 4) return set.speakers.map((s, i) => ({ title: `Speaker ${i + 1}`, segments: s.segments }));
  return playUnits(set);
}

export const speakerLabel = (s: Segment['speaker']): string => (s === 'N' ? 'Narrator' : `Speaker ${s}`);
