import { describe, expect, it } from 'vitest';
import { areaStats, errorLog, weakestAreas, weekActivity } from '../src/domain/weakAreas';
import type { Attempt } from '../src/storage/store';

let seq = 0;
const att = (o: Partial<Attempt> = {}): Attempt => ({
  id: `a${++seq}`,
  sessionId: 's1',
  questionId: `q${seq}`,
  setId: 'set1',
  paper: 'rue',
  part: 1,
  type: 'vocab',
  answer: 'x',
  marks: 1,
  maxMarks: 1,
  at: '2026-11-20T10:00:00',
  ...o,
});
/** n attempts for one group, `right` of them correct */
const group = (part: number, type: string, n: number, right: number): Attempt[] =>
  Array.from({ length: n }, (_, i) => att({ part, type, marks: i < right ? 1 : 0 }));

describe('areaStats', () => {
  it('is empty for no data', () => {
    expect(areaStats([])).toEqual([]);
    expect(weakestAreas([])).toEqual([]);
    expect(errorLog([])).toEqual([]);
  });
  it('counts partial KWT marks proportionally', () => {
    const a = [att({ part: 4, type: 'kwt', marks: 1, maxMarks: 2 }), att({ part: 4, type: 'kwt', marks: 2, maxMarks: 2 })];
    const g = areaStats(a)[0]!;
    expect(g.n).toBe(2);
    expect(g.accuracy).toBeCloseTo(0.75);
    expect(areaStats([a[0]!])[0]!!.accuracy).toBe(0.5);
  });
  it('n=9 is not eligible, n=10 is', () => {
    expect(areaStats(group(1, 'a', 9, 9))[0]!.eligible).toBe(false);
    expect(areaStats(group(1, 'a', 10, 10))[0]!.eligible).toBe(true);
  });
  it('groups by paper, part and type', () => {
    const a = [att(), att({ paper: 'listening' }), att({ part: 2 }), att({ type: 'other' })];
    expect(areaStats(a)).toHaveLength(4);
  });
});

describe('weakestAreas', () => {
  it('excludes groups below 10 and orders the weakest 3 ascending', () => {
    const a = [
      ...group(1, 'a', 10, 9), // 90%
      ...group(2, 'b', 10, 3), // 30%
      ...group(3, 'c', 10, 5), // 50%
      ...group(4, 'd', 10, 7), // 70%
      ...group(5, 'e', 9, 0), // 0% but n=9
    ];
    expect(weakestAreas(a).map((g) => g.type)).toEqual(['b', 'c', 'd']);
  });
  it('returns fewer than 3 when fewer are eligible', () => {
    expect(weakestAreas([...group(1, 'a', 10, 5), ...group(2, 'b', 3, 0)])).toHaveLength(1);
  });
  it('breaks ties by larger n', () => {
    const a = [...group(1, 'small', 10, 5), ...group(2, 'big', 20, 10)];
    expect(weakestAreas(a).map((g) => g.type)).toEqual(['big', 'small']);
  });
  it('uses partial marks for ranking', () => {
    const kwt = Array.from({ length: 10 }, () => att({ part: 4, type: 'kwt', marks: 1, maxMarks: 2 })); // 50%
    expect(weakestAreas([...kwt, ...group(1, 'a', 10, 6)])[0]!.type).toBe('kwt');
  });
});

describe('errorLog', () => {
  it('keeps a question whose latest attempt is wrong', () => {
    const a = [att({ questionId: 'q', marks: 1, at: '2026-11-20T10:00:00' }), att({ questionId: 'q', marks: 0, at: '2026-11-21T10:00:00' })];
    expect(errorLog(a)).toHaveLength(1);
  });
  it('a later correct attempt removes it, regardless of array order', () => {
    const wrong = att({ questionId: 'q', marks: 0, at: '2026-11-20T10:00:00' });
    const right = att({ questionId: 'q', marks: 1, at: '2026-11-21T10:00:00' });
    expect(errorLog([wrong, right])).toEqual([]);
    expect(errorLog([right, wrong])).toEqual([]);
  });
  it('a self-marked correct attempt counts as correct', () => {
    const wrong = att({ questionId: 'q', marks: 0, at: '2026-11-20T10:00:00' });
    const self = att({ questionId: 'q', marks: 1, selfMarked: true, at: '2026-11-21T10:00:00' });
    expect(errorLog([wrong, self])).toEqual([]);
  });
  it('partial KWT marks are still an error', () => {
    expect(errorLog([att({ marks: 1, maxMarks: 2 })])).toHaveLength(1);
  });
  it('lists the questions newest first', () => {
    const a = att({ questionId: 'old', marks: 0, at: '2026-11-18T10:00:00' });
    const b = att({ questionId: 'new', marks: 0, at: '2026-11-19T10:00:00' });
    expect(errorLog([a, b]).map((x) => x.questionId)).toEqual(['new', 'old']);
  });
});

describe('weekActivity', () => {
  const now = new Date(2026, 10, 23, 12, 0, 0);
  it('returns 7 local days ending today, zero-filled', () => {
    const days = weekActivity([], now);
    expect(days).toHaveLength(7);
    expect(days[0]!.date).toBe('2026-11-17');
    expect(days[6]!.date).toBe('2026-11-23');
    expect(days.every((d) => d.attempts === 0)).toBe(true);
  });
  it('counts attempts per day and ignores older ones', () => {
    const a = [
      att({ at: new Date(2026, 10, 23, 0, 5).toISOString() }),
      att({ at: new Date(2026, 10, 23, 23, 55).toISOString() }),
      att({ at: new Date(2026, 10, 17, 8, 0).toISOString() }),
      att({ at: new Date(2026, 10, 16, 23, 59).toISOString() }),
    ];
    const days = weekActivity(a, now);
    expect(days[6]!.attempts).toBe(2);
    expect(days[0]!.attempts).toBe(1);
    expect(days.reduce((s, d) => s + d.attempts, 0)).toBe(3);
  });
});
