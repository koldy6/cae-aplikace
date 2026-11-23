import { describe, expect, test } from 'vitest';
import { buildWritingPrompt, wordCount, wordState } from '../src/domain/prompts';
import { referenceSchema, schemaFor, writingSchema } from '../src/content/schema';
import { formatReference, writingTasks } from '../src/content/loader';


const reference = formatReference()!;
const task = writingTasks[0]!;

describe('buildWritingPrompt', () => {
  const answer = 'First line of my answer.\nSecond line with extra   spaces.';
  const p = buildWritingPrompt(task, answer, reference);
  test('contains task, input, points, answer and word count', () => {
    expect(p).toContain(task.instructions);
    expect(p).toContain(task.inputText);
    for (const pt of task.points) expect(p).toContain(pt);
    expect(p).toContain(answer);
    expect(p).toContain(`(${wordCount(answer)} words)`);
  });
  test('contains all 4 criteria and the disclaimer, and asks for a Czech summary', () => {
    expect(reference.writingCriteria).toHaveLength(4);
    for (const c of reference.writingCriteria) expect(p).toContain(c.name);
    expect(p).toContain(reference.notice.en);
    expect(p).toMatch(/in Czech/);
    expect(p).toMatch(/corrected/);
  });
});

describe('wordCount / wordState', () => {
  test('counts whitespace-separated words', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  \n ')).toBe(0);
    expect(wordCount("It's a well-known\nfact  ")).toBe(4);
  });
  test('state relative to 220-260', () => {
    expect([0, 219, 220, 260, 261].map((n) => wordState(n, 220, 260))).toEqual(['empty', 'short', 'ok', 'ok', 'long']);
  });
});

describe('writing and reference schemas', () => {
  const good = JSON.parse(JSON.stringify(task));
  const bad = (patch: object) => writingSchema.safeParse({ ...good, ...patch }).success;
  test('bundled files are valid and routed by schemaFor', () => {
    expect(writingSchema.safeParse(task).success).toBe(true);
    expect(referenceSchema.safeParse(reference).success).toBe(true);
    expect(schemaFor(task)).toBe(writingSchema);
    expect(schemaFor(reference)).toBe(referenceSchema);
  });
  test('rules', () => {
    expect(bad({ taskType: 'letter' })).toBe(false); // part 1 must be essay
    expect(bad({ points: ['one'] })).toBe(false);
    expect(bad({ points: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(bad({ part: 2, taskType: 'essay', points: [] })).toBe(false);
    expect(bad({ part: 2, taskType: 'email', points: [] })).toBe(true);
    expect(bad({ part: 2, taskType: 'email', points: ['x'] })).toBe(false);
    expect(bad({ instructions: 'use <b>' })).toBe(false);
    expect(bad({ extra: 1 })).toBe(false);
  });
  test('reference needs exactly 4 writing criteria and >=5 speaking', () => {
    const r = JSON.parse(JSON.stringify(reference));
    expect(referenceSchema.safeParse({ ...r, writingCriteria: r.writingCriteria.slice(1) }).success).toBe(false);
    expect(referenceSchema.safeParse({ ...r, speakingCriteria: r.speakingCriteria.slice(0, 4) }).success).toBe(false);
    expect(referenceSchema.safeParse({ ...r, timings: { ...r.timings, partOneSeconds: 120 } }).success).toBe(true);
  });
});
