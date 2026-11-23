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

describe('Part 4 and Part 7 attempts', () => {
  const at = new Date().toISOString();
  it('stores KWT marks 0/1/2 in attempt.marks with maxMarks 2', () => {
    const p4 = setsFor('rue', 4)[0] as Extract<ReturnType<typeof setsFor>[number], { part: 4 }>;
    const [i1, i2, i3] = p4.items;
    const a = buildAttempts(p4, { 1: i1!.fullAnswers[0]!, 2: i2!.parts[0]!.accepted[0] ?? '', 3: '' }, 's4', at);
    expect(a).toHaveLength(6);
    expect(a[0]).toMatchObject({ part: 4, marks: 2, maxMarks: 2, questionId: `${p4.id}#1` });
    expect(a[2]!.marks).toBe(0);
    expect(i3).toBeDefined();
    expect(recomputeSession(newSession(p4, 's4', at), a).maxMarks).toBe(12);
  });
  it('scores Part 7 as 2 marks per correct gap', () => {
    const p7 = setsFor('rue', 7)[0] as Extract<ReturnType<typeof setsFor>[number], { part: 7 }>;
    const answers = Object.fromEntries(p7.questions.map((q, i) => [q.n, i < 2 ? q.answer : '']));
    const a = buildAttempts(p7, answers, 's7', at);
    const s = recomputeSession(newSession(p7, 's7', at), a);
    expect([s.marks, s.maxMarks]).toEqual([4, 12]);
  });
});

import { blocksImplicitSubmit, isOpen } from '../src/domain/drill';
describe('QA fixes', () => {
  it('Enter in a text input is blocked, button and select are not', () => {
    expect(blocksImplicitSubmit('Enter', 'INPUT', 'text')).toBe(true);
    expect(blocksImplicitSubmit('Enter', 'BUTTON', 'submit')).toBe(false);
    expect(blocksImplicitSubmit('Enter', 'SELECT', 'select-one')).toBe(false);
    expect(blocksImplicitSubmit('a', 'INPUT', 'text')).toBe(false);
  });
  it('self-mark covers Parts 2-4', () => {
    expect([1, 2, 3, 4, 7].map(isOpen)).toEqual([false, true, true, true, false]);
  });
});
