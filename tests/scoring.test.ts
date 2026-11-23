import { describe, expect, it } from 'vitest';
import { kwtScore, maxMarks, normalise, scoreLetter, scoreOpen, type KwtItem } from '../src/domain/scoring';
import { rue4Schema } from '../src/content/schema';

const REAL = import.meta.glob('../src/content/data/rue/part4/rue4-001.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('letters (Part 1, 7)', () => {
  it('scores correct and wrong letters, ignoring case and spaces', () => {
    expect(scoreLetter('B', 'B')).toBe(1);
    expect(scoreLetter(' b ', 'B')).toBe(1);
    expect(scoreLetter('C', 'B')).toBe(0);
    expect(scoreLetter('', 'B')).toBe(0);
  });
});

describe('normalise / open answers (Part 2, 3)', () => {
  it('normalises case, whitespace and curly apostrophes', () => {
    expect(normalise('  Don’t   GO ')).toBe("don't go");
  });
  it('accepts alternatives and normalised input', () => {
    expect(scoreOpen('  OF ', ['of'])).toBe(1);
    expect(scoreOpen('whom', ['who', 'whom'])).toBe(1);
    expect(scoreOpen('don’t', ["don't"])).toBe(1);
  });
  it('rejects wrong and empty answers', () => {
    expect(scoreOpen('off', ['of'])).toBe(0);
    expect(scoreOpen('  ', ['of'])).toBe(0);
  });
});

const item: KwtItem = {
  n: 1,
  sentence1: 's',
  keyWord: 'PROVIDED',
  before: 'b',
  after: 'a',
  parts: [{ accepted: ['provided the forecast', 'provided that the forecast'] }, { accepted: ['does not', "doesn't"] }],
  fullAnswers: ['provided the forecast does not', 'provided that the forecast does not', "provided the forecast doesn't"],
  type: 'conditional',
  explanation: { en: 'e', cs: 'c' },
} as KwtItem;

describe('kwtScore', () => {
  it('2 when both parts are right, with case/space/apostrophe variation', () => {
    expect(kwtScore('provided the forecast does not', item)).toBe(2);
    expect(kwtScore('  Provided  THAT the forecast does not ', item)).toBe(2);
    expect(kwtScore('provided the forecast doesn’t', item)).toBe(2);
  });
  it('1 when only one part is right', () => {
    expect(kwtScore('provided the forecast is', item)).toBe(1);
    expect(kwtScore('provided it does not', item)).toBe(1);
  });
  it('1, not 2, for a combination absent from fullAnswers (T06 note)', () => {
    expect(kwtScore("provided that the forecast doesn't", item)).toBe(1);
  });
  it('0 when the key word is missing or changed', () => {
    expect(kwtScore('if the forecast does not', item)).toBe(0);
    expect(kwtScore('provide the forecast does not', item)).toBe(0);
  });
  it('0 over 6 words, and contractions count as 2', () => {
    expect(kwtScore('provided that the forecast does not really', item)).toBe(0);
    // 5 words + doesn't (2) = 7 > 6
    expect(kwtScore("provided that the forecast doesn't", item)).not.toBe(2);
  });
  it('0 for empty or wrong', () => {
    expect(kwtScore('', item)).toBe(0);
    expect(kwtScore('provided something else', item)).toBe(0);
  });
  it('works on real content (rue4-001)', () => {
    const set = rue4Schema.parse(JSON.parse(Object.values(REAL)[0]!));
    for (const it of set.items) {
      expect(kwtScore(it.fullAnswers[0]!, it)).toBe(2);
      expect(kwtScore('nonsense', it)).toBe(0);
    }
  });
});

describe('maxMarks', () => {
  it('is 2 for Parts 4 and 7, else 1', () => {
    expect([1, 2, 3, 4, 7].map((p) => maxMarks(p))).toEqual([1, 1, 1, 2, 2]);
  });
});

describe('maxMarks for Listening', () => {
  it('is always 1, R&UoE unchanged', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((p) => maxMarks(p, 'listening'))).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(maxMarks(4, 'rue')).toBe(2);
  });
});
