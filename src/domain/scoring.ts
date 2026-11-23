import { norm, kwtWordCount } from '../content/schema';
import type { Rue4Set } from '../content/types';

export { norm as normalise };

export type KwtItem = Rue4Set['items'][number];
export type Marks = 0 | 1 | 2;

/** Letter answers (Part 1 A-D, Part 7 A-G): 1 if equal, ignoring case and whitespace. */
export const scoreLetter = (given: string, correct: string): 0 | 1 =>
  given.trim().toUpperCase() === correct.toUpperCase() ? 1 : 0;

/** Open answers (Part 2, Part 3): 1 if the normalised answer equals any accepted answer. */
export const scoreOpen = (given: string, accepted: readonly string[]): 0 | 1 => {
  const g = norm(given);
  return g !== '' && accepted.some((a) => norm(a) === g) ? 1 : 0;
};

const hasPhrase = (full: string, phrase: string) => ` ${norm(full)} `.includes(` ${norm(phrase)} `);

/**
 * Key word transformation, 0-2 marks (A7: over 6 words = 0, contractions count as 2).
 * 2 = the answer equals one of `fullAnswers` (so unrelated part variants cannot combine);
 * 1 = key word kept unchanged and at least one part has an accepted variant; else 0.
 */
export function kwtScore(given: string, item: KwtItem): Marks {
  const g = norm(given);
  if (g === '' || kwtWordCount(g) > 6 || !hasPhrase(g, item.keyWord)) return 0;
  if (item.fullAnswers.some((f) => norm(f) === g)) return 2;
  return item.parts.some((p) => p.accepted.some((a) => hasPhrase(g, a))) ? 1 : 0;
}

/** Maximum marks per question: R&UoE KWT = 2, Parts 5-7 = 2 per question, others (incl. Part 8) 1; Listening is always 1. */
export const maxMarks = (part: number, paper = 'rue'): 1 | 2 => (paper !== 'listening' && part >= 4 && part <= 7 ? 2 : 1);
