import { describe, expect, it } from 'vitest';
import { listeningSets } from '../src/content/loader';
import type { ListeningSet } from '../src/content/types';
import { buildListeningAttempts, listeningQuestions, playUnits, scoreListening } from '../src/domain/listening';
import { recomputeSession, newSession } from '../src/domain/drill';

const all = [1, 2, 3, 4].flatMap((p) => listeningSets(p));

describe('listening domain (whatever content exists)', () => {
  it.each(all.map((s) => [s.id, s] as const))('%s: full answer key scores full marks, 1 mark each', (_id, s) => {
    const qs = listeningQuestions(s);
    expect(qs.map((q) => q.n)).toEqual(qs.map((_, i) => i + 1));
    expect(playUnits(s).length).toBeGreaterThan(0);
    const key = Object.fromEntries(qs.map((q) => [q.n, q.keys[0]!]));
    const at = '2026-01-01T00:00:00Z';
    const attempts = buildListeningAttempts(s, key, 's', at);
    const session = recomputeSession(newSession(s, 's', at, 'listening'), attempts);
    expect([session.marks, session.maxMarks]).toEqual([qs.length, qs.length]);
    expect(attempts.every((a) => a.paper === 'listening' && a.maxMarks === 1)).toBe(true);
    expect(session.perPart[`listening:${s.part}`]).toEqual({ marks: qs.length, maxMarks: qs.length });
  });
  it('only the retried questions get attempts', () => {
    const s = all[0];
    if (!s) return;
    expect(buildListeningAttempts(s, {}, 's', 't', new Set([1])).map((a) => a.questionId)).toEqual([`${s.id}#1`]);
  });
});

describe('scoreListening', () => {
  const open = { n: 1, type: 'x', explanation: { en: '', cs: '' }, keys: ['the 1990s', 'nineties'], label: '' };
  const mc = { ...open, keys: ['B'], options: { A: 'a', B: 'b', C: 'c' } };
  it('open answers ignore case; letters ignore case/space', () => {
    expect(scoreListening(open, ' The 1990s ')).toBe(1);
    expect(scoreListening(open, '')).toBe(0);
    expect(scoreListening(mc, 'b ')).toBe(1);
    expect(scoreListening(mc, 'A')).toBe(0);
  });
});

it('Part 4 numbering: task 2 follows task 1', () => {
  const s = listeningSets(4)[0] as ListeningSet | undefined;
  if (!s) return;
  const qs = listeningQuestions(s);
  expect(qs).toHaveLength(10);
  expect(qs[5]!.label).toBe('Speaker 1, task 2');
});
