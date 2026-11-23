import { describe, expect, it } from 'vitest';
import { content } from '../src/content/loader';
import { buildAttempts, isDrillSet, isGapSet, questionsOf, scoreAny } from '../src/domain/drill';
import { errorLog } from '../src/domain/weakAreas';
import { kwtScore, maxMarks } from '../src/domain/scoring';

const drillSets = Object.values(content.rue ?? {}).flat().filter(isDrillSet);

describe('QA M1: shipped content is consistent with the scorer', () => {
  it('has content for Parts 1-8', () => {
    expect([...new Set(drillSets.map((s) => s.part))].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('every key earns full marks through scoreAny', () => {
    for (const s of drillSets) {
      for (const q of questionsOf(s)) {
        const key = s.part === 4 ? '' : 'answer' in q ? q.answer : 'answers' in q ? q.answers[0]! : '';
        if (s.part === 4) continue;
        expect(scoreAny(s, q, key), `${s.id}#${q.n}`).toBe(maxMarks(s.part));
      }
    }
  });
  it('every accepted answer scores full marks (all Part 2/3 variants, all KWT fullAnswers)', () => {
    for (const s of drillSets) {
      if (isGapSet(s)) for (const q of s.questions) if ('answers' in q) for (const a of q.answers) expect(scoreAny(s, q, a), `${s.id}#${q.n} "${a}"`).toBe(1);
      if (s.part === 4) for (const it of s.items) for (const f of it.fullAnswers) expect(kwtScore(f, it), `${s.id}#${it.n} "${f}"`).toBe(2);
    }
  });
  it('the key word alone, and an empty answer, never score in KWT', () => {
    for (const s of drillSets) if (s.part === 4) for (const it of s.items) {
      expect(kwtScore(it.keyWord, it), `${s.id}#${it.n}`).toBe(0);
      expect(kwtScore('', it)).toBe(0);
    }
  });
  it('Part 1 keys exist in options and Part 7 keys exist among paragraphs', () => {
    for (const s of drillSets) {
      if (s.part === 1) for (const q of s.questions) expect(Object.keys(q.options), `${s.id}#${q.n}`).toContain(q.answer);
      if (s.part === 7) for (const q of s.questions) expect(s.paragraphs.map((p) => p.id), `${s.id}#${q.n}`).toContain(q.answer);
    }
  });
  it('a wrong letter or blank scores 0 for every question', () => {
    for (const s of drillSets) for (const q of questionsOf(s)) {
      expect(scoreAny(s, q, ''), `${s.id}#${q.n}`).toBe(0);
      expect(scoreAny(s, q, 'Z'), `${s.id}#${q.n}`).toBe(0);
    }
  });
});

describe('QA M1: retry attempts', () => {
  it('buildAttempts with `only` stores attempts for the retried questions only, and a correct retry clears the error log', () => {
    const s = drillSets.find((x) => x.part === 1)!;
    const first = buildAttempts(s, {}, 's1', '2026-11-20T10:00:00.000Z');
    expect(errorLog(first)).toHaveLength(s.questions.length);
    const q1 = s.questions[0]!;
    const retry = buildAttempts(s, { [q1.n]: 'answer' in q1 ? q1.answer : '' }, 's2', '2026-11-21T10:00:00.000Z', new Set([q1.n]));
    expect(retry).toHaveLength(1);
    expect(retry[0]!.marks).toBe(1);
    const log = errorLog([...first, ...retry]);
    expect(log).toHaveLength(s.questions.length - 1);
    expect(log.some((a) => a.questionId === retry[0]!.questionId)).toBe(false);
  });
});
