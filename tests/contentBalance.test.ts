import { describe, expect, it } from 'vitest';
import { content } from '../src/content/loader';

// Guards QA M1 defects M-1 / M-2: keys must not be guessable from position.
const sets = Object.values(content.rue ?? {}).flat() as unknown as {
  id: string;
  part: number;
  paragraphs?: { id: string }[];
  questions: { answer: string }[];
}[];
const part1 = sets.filter((s) => s.part === 1);
const part5 = sets.filter((s) => s.part === 5);
const part7 = sets.filter((s) => s.part === 7);

describe('answer keys are balanced', () => {
  it('Part 1: no letter is the key for more than 4 of 8 questions', () => {
    expect(part1.length).toBeGreaterThan(0);
    for (const s of part1) {
      const counts: Record<string, number> = {};
      for (const q of s.questions) counts[q.answer] = (counts[q.answer] ?? 0) + 1;
      expect(Math.max(...Object.values(counts)), s.id).toBeLessThanOrEqual(4);
    }
  });

  it('Part 5: the 6 keys are not all the same letter', () => {
    expect(part5.length).toBeGreaterThan(0);
    for (const s of part5) expect(new Set(s.questions.map((q) => q.answer)).size, s.id).toBeGreaterThan(1);
  });

  it('Part 7: keys are not in strictly ascending letter order', () => {
    expect(part7.length).toBeGreaterThan(0);
    for (const s of part7) {
      const keys = s.questions.map((q) => q.answer);
      const ascending = keys.every((k, i) => i === 0 || k > keys[i - 1]!);
      expect(ascending, `${s.id}: ${keys.join('')}`).toBe(false);
    }
  });

  it('Part 7: the unused paragraph is not always the last one', () => {
    const unusedIsLast = part7.map((s) => {
      const used = new Set(s.questions.map((q) => q.answer));
      const ids = s.paragraphs!.map((p) => p.id).sort();
      return ids.filter((id) => !used.has(id)).includes(ids[ids.length - 1]!);
    });
    expect(unusedIsLast.every(Boolean)).toBe(false);
  });
});

describe('Listening keys are balanced', () => {
  const qs = (part: number) =>
    (content.listening?.[part] ?? []).map((s) => {
      const x = s as unknown as { id: string; questions?: { answer: string }[]; extracts?: { questions: { answer: string }[] }[] };
      return { id: x.id, keys: (x.questions ?? x.extracts!.flatMap((e) => e.questions)).map((q) => q.answer) };
    });
  it.each([1, 3])('Part %i: no letter is the key for more than half of the questions', (part) => {
    expect(qs(part).length).toBeGreaterThan(0);
    for (const { id, keys } of qs(part)) {
      const counts: Record<string, number> = {};
      for (const k of keys) counts[k] = (counts[k] ?? 0) + 1;
      expect(Math.max(...Object.values(counts)), id).toBeLessThanOrEqual(keys.length / 2);
    }
  });
});
