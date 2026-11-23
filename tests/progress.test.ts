import { describe, expect, it } from 'vitest';
import { setsFor } from '../src/content/loader';
import { buildAttempts, isGapSet } from '../src/domain/drill';
import { correctShort, formatArea, meterClass, partStats, questionNumber, retryGroups } from '../src/domain/progress';
import { errorLog } from '../src/domain/weakAreas';

const set = setsFor('rue', 2).find(isGapSet)!;
const wrongAll = (sid: string, at: string, only?: Set<number>) => buildAttempts(set, {}, sid, at, only);

describe('progress helpers', () => {
  it('parses question numbers', () => {
    expect(questionNumber('abc#12')).toBe(12);
    expect(questionNumber('abc')).toBeNull();
  });
  it('groups error-log items by set', () => {
    const errs = errorLog(wrongAll('s1', '2026-01-01T10:00:00Z'));
    const g = retryGroups(errs);
    expect(g).toHaveLength(1);
    expect(g[0]!.setId).toBe(set.id);
    expect(g[0]!.ns).toEqual(set.questions.map((q) => q.n).sort((a, b) => a - b));
  });
  it('formats areas and meter classes', () => {
    expect(formatArea({ part: 3, type: 'word-formation', accuracy: 0.55 })).toBe('Part 3 word formation: 55 %');
    expect(meterClass(0.57)).toBe('w-55');
    expect(meterClass(1)).toBe('w-100');
    expect(meterClass(0)).toBe('w-0');
  });
  it('computes per-part accuracy', () => {
    const a = wrongAll('s1', '2026-01-01T10:00:00Z');
    expect(partStats(a)).toEqual([{ paper: 'rue', part: 2, n: a.length, accuracy: 0 }]);
  });
  it('gives a short correct answer', () => {
    expect(correctShort(set, set.questions[0]!).length).toBeGreaterThan(0);
  });
});

describe('retry removes corrected questions from the error log', () => {
  it('only the correctly retried question leaves the log', () => {
    const first = wrongAll('s1', '2026-01-01T10:00:00Z');
    const q1 = set.questions[0]!;
    const right = 'answers' in q1 ? q1.answers[0]! : q1.answer;
    const retry = buildAttempts(set, { [q1.n]: right }, 's2', '2026-01-02T10:00:00Z', new Set([q1.n, set.questions[1]!.n]));
    expect(retry).toHaveLength(2);
    const log = errorLog([...first, ...retry]).map((a) => a.questionId);
    expect(log).not.toContain(`${set.id}#${q1.n}`);
    expect(log).toContain(`${set.id}#${set.questions[1]!.n}`);
    expect(log).toHaveLength(set.questions.length - 1);
  });
});
