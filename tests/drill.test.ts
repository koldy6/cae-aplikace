import { describe, expect, it } from 'vitest';
import { setsFor } from '../src/content/loader';
import {
  buildAttempts, daysToExam, isGapSet, lastScore, newSession, parseGapText, recomputeSession, selfMarkAttempt,
} from '../src/domain/drill';

describe('parseGapText', () => {
  it('splits paragraphs and gaps', () => {
    expect(parseGapText('A [[1]] b.\n\nC [[2]][[3]]')).toEqual([
      [{ t: 'text', value: 'A ' }, { t: 'gap', n: 1 }, { t: 'text', value: ' b.' }],
      [{ t: 'text', value: 'C ' }, { t: 'gap', n: 2 }, { t: 'gap', n: 3 }],
    ]);
  });
  it('handles text without gaps', () => {
    expect(parseGapText('Plain')).toEqual([[{ t: 'text', value: 'Plain' }]]);
  });
});

describe('attempts and session', () => {
  const p1 = setsFor('rue', 1).find(isGapSet)!;
  const p2 = setsFor('rue', 2).find(isGapSet)!;
  it('scores a Part 1 drill and stores part and type', () => {
    const answers = Object.fromEntries(p1.questions.map((q, i) => [q.n, i < 3 && 'answer' in q ? q.answer : 'Z']));
    const at = new Date().toISOString();
    const attempts = buildAttempts(p1, answers, 's1', at);
    expect(attempts).toHaveLength(8);
    expect(attempts[0]).toMatchObject({ part: 1, paper: 'rue', questionId: `${p1.id}#1`, marks: 1, maxMarks: 1 });
    expect(attempts[0]!.type).toBeTruthy();
    const s = recomputeSession(newSession(p1, 's1', at), attempts);
    expect([s.marks, s.maxMarks]).toEqual([3, 8]);
    expect(s.perPart['rue:1']).toEqual({ marks: 3, maxMarks: 8 });
  });
  it('self-marking raises the session score', () => {
    const at = new Date().toISOString();
    const attempts = buildAttempts(p2, {}, 's2', at);
    expect(recomputeSession(newSession(p2, 's2', at), attempts).marks).toBe(0);
    attempts[0] = selfMarkAttempt(attempts[0]!);
    expect(attempts[0]).toMatchObject({ marks: 1, selfMarked: true });
    expect(recomputeSession(newSession(p2, 's2', at), attempts).marks).toBe(1);
  });
});

describe('daysToExam / lastScore', () => {
  const now = new Date(2026, 10, 23, 15, 0);
  it('counts days, handles today, past and unset', () => {
    expect(daysToExam('2026-12-03', now)).toBe(10);
    expect(daysToExam('2026-11-23', now)).toBe(0);
    expect(daysToExam('2026-11-20', now)).toBe(-3);
    expect(daysToExam(null, now)).toBeNull();
    expect(daysToExam('garbage', now)).toBeNull();
  });
  it('returns the latest score of a set', () => {
    const p1 = setsFor('rue', 1).find(isGapSet)!;
    const a = { ...newSession(p1, 'a', '2026-01-01T00:00:00Z'), marks: 2, maxMarks: 8 };
    const b = { ...newSession(p1, 'b', '2026-02-01T00:00:00Z'), marks: 5, maxMarks: 8 };
    expect(lastScore([a, b], p1.id)).toBe('5/8');
    expect(lastScore([], p1.id)).toBeNull();
  });
});
