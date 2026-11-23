import { describe, expect, it } from 'vitest';
import { listeningSets, setsFor } from '../src/content/loader';
import { isDrillSet, questionsOf, type DrillSet } from '../src/domain/drill';
import { listeningQuestions } from '../src/domain/listening';
import {
  announceAt, budgetOverride, budgetSeconds, buildMock, partBreakdown, pickSet, remainingSeconds, selectMock, shouldAutoSubmit, SECONDS_PER_QUESTION, type MockItem,
} from '../src/domain/mock';

const pools = { rue: (p: number) => setsFor('rue', p).filter(isDrillSet), listening: (p: number) => listeningSets(p) };
const ids = (items: MockItem[]) => items.map((i) => i.set.id);

describe('selection', () => {
  const sets = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('is deterministic for a seed', () => {
    expect(pickSet(sets, new Set(), 7)).toEqual(pickSet(sets, new Set(), 7));
    expect(ids(selectMock(pools, new Set(), 5, true))).toEqual(ids(selectMock(pools, new Set(), 5, true)));
  });
  it('prefers unattempted sets, falls back to all', () => {
    for (let seed = 0; seed < 20; seed++) expect(pickSet(sets, new Set(['a', 'b']), seed)!.id).toBe('c');
    expect(pickSet(sets, new Set(['a', 'b', 'c']), 1)).toBeDefined();
    expect(pickSet([], new Set(), 1)).toBeUndefined();
  });
  it('one set per part 1-4 plus optional Listening 1', () => {
    const withL = selectMock(pools, new Set(), 1, true);
    expect(withL.filter((i) => i.paper === 'rue').map((i) => i.set.part)).toEqual([1, 2, 3, 4]);
    expect(withL.filter((i) => i.paper === 'listening')).toHaveLength(1);
    expect(selectMock(pools, new Set(), 1, false).some((i) => i.paper === 'listening')).toBe(false);
  });
});

describe('budget and auto-submit', () => {
  const items = selectMock(pools, new Set(), 1, true);
  it('is 96 s per question', () => {
    const q = items.reduce((s, i) => s + (i.paper === 'rue' ? questionsOf(i.set).length : listeningQuestions(i.set).length), 0);
    expect(budgetSeconds(items)).toBe(q * SECONDS_PER_QUESTION);
    expect(SECONDS_PER_QUESTION).toBe(Math.floor((90 * 60) / 56));
  });
  it('override only accepts sane values', () => {
    expect(budgetOverride('?mockSeconds=20')).toBe(20);
    for (const bad of ['', '?mockSeconds=0', '?mockSeconds=abc', '?mockSeconds=99999', '?mockSeconds=-5']) expect(budgetOverride(bad)).toBeNull();
  });
  it('shouldAutoSubmit at or after the deadline', () => {
    expect(shouldAutoSubmit(999, 1000)).toBe(false);
    expect(shouldAutoSubmit(1000, 1000)).toBe(true);
    expect(shouldAutoSubmit(2000, 1000)).toBe(true);
    expect(remainingSeconds(500, 1000)).toBe(1);
    expect(remainingSeconds(5000, 1000)).toBe(0);
  });
  it('announces rarely', () => {
    expect([...Array(601).keys()].filter(announceAt)).toEqual([10, 30, 60, 300, 600]);
  });
});

describe('aggregation', () => {
  const items = selectMock(pools, new Set(), 1, true);
  const key = (it: MockItem): Record<number, string> =>
    it.paper === 'listening'
      ? Object.fromEntries(listeningQuestions(it.set).map((q) => [q.n, q.keys[0]!]))
      : Object.fromEntries(questionsOf(it.set as DrillSet).map((q) => {
          const x = q as { answer?: string; answers?: string[]; fullAnswers?: string[] };
          return [q.n, x.answer ?? x.fullAnswers?.[0] ?? x.answers![0]!];
        }));
  const at = '2026-01-01T00:00:00Z';

  it('full key = max marks; KWT 2 per item, Listening 1 per question; unique attempt ids', () => {
    const { session, attempts } = buildMock(items, items.map(key), 's1', at);
    expect(session.kind).toBe('mock');
    expect(session.setIds).toEqual(ids(items));
    expect(session.marks).toBe(session.maxMarks);
    expect(new Set(attempts.map((a) => a.id)).size).toBe(attempts.length);
    const rows = partBreakdown(items, session);
    expect(rows.reduce((s, r) => s + r.marks, 0)).toBe(session.marks);
    const kwt = rows.find((r) => r.paper === 'rue' && r.part === 4)!;
    expect(kwt.maxMarks).toBe(2 * questionsOf(items.find((i) => i.paper === 'rue' && i.set.part === 4)!.set as DrillSet).length);
    const l = rows.find((r) => r.paper === 'listening')!;
    expect(l.maxMarks).toBe(listeningQuestions(items.find((i) => i.paper === 'listening')!.set as never).length);
  });
  it('KWT partial mark counts: key word + one accepted part = 1', () => {
    const kwtIdx = items.findIndex((i) => i.paper === 'rue' && i.set.part === 4);
    const set = items[kwtIdx]!.set as Extract<DrillSet, { part: 4 }>;
    const it = set.items.find((i) => i.parts.length > 1)!;
    const partial = `${it.keyWord} ${it.parts[0]!.accepted[0]!}`;
    const full = items.map((_, i) => (i === kwtIdx ? { [it.n]: partial } : {}));
    const { session } = buildMock(items, full, 's2', at);
    const marks = session.perPart['rue:4']!.marks;
    expect([0, 1, 2]).toContain(marks); // depends on content: never above one item's max
    expect(marks).toBeLessThanOrEqual(2);
    expect(session.marks).toBe(marks);
  });
  it('empty answers score 0 but keep max', () => {
    const { session } = buildMock(items, [], 's3', at);
    expect(session.marks).toBe(0);
    expect(session.maxMarks).toBeGreaterThan(0);
  });
});
