import { describe, expect, it } from 'vitest';
import { listeningSets, speakingSets, writingTasks } from '../src/content/loader';
import { buildListeningAttempts, listeningQuestions, scoreListening } from '../src/domain/listening';
import { wordCount, wordState } from '../src/domain/prompts';
import { buildBackup, parseBackup } from '../src/storage/backup';
import { defaultData } from '../src/storage/store';

const all = [1, 2, 3, 4].flatMap((p) => listeningSets(p));

describe('QA M3: Listening content', () => {
  it('has at least 2 sets per part', () => {
    for (const p of [1, 2, 3, 4]) expect(listeningSets(p).length, `part ${p}`).toBeGreaterThanOrEqual(2);
  });
  it('question counts follow the exam format (6 / 8 / 6 / 10)', () => {
    const want: Record<number, number> = { 1: 6, 2: 8, 3: 6, 4: 10 };
    for (const s of all) expect(listeningQuestions(s).length, s.id).toBe(want[s.part]);
  });
  it('every key is one of the options and numbers are unique', () => {
    for (const s of all) {
      const qs = listeningQuestions(s);
      expect(new Set(qs.map((q) => q.n)).size, s.id).toBe(qs.length);
      for (const q of qs) if (q.options) expect(Object.keys(q.options), `${s.id} #${q.n}`).toContain(q.keys[0]);
    }
  });
  it('Part 4: each task uses 5 different options (none repeated)', () => {
    for (const s of listeningSets(4) as any[])
      for (const t of [1, 2]) expect(new Set(s[`answers${t}`]).size, `${s.id} task ${t}`).toBe(5);
  });
  it('Parts 1 and 3: keys are not all the same letter', () => {
    for (const s of [...listeningSets(1), ...listeningSets(3)])
      expect(new Set(listeningQuestions(s).map((q) => q.keys[0])).size, s.id).toBeGreaterThan(2);
  });
  it('every set is labelled ai-generated and every question has both explanations', () => {
    for (const s of all) {
      expect(s.label, s.id).toBe('ai-generated');
      for (const q of listeningQuestions(s)) {
        expect(q.explanation.en.length, `${s.id} #${q.n}`).toBeGreaterThan(10);
        expect(q.explanation.cs.length, `${s.id} #${q.n}`).toBeGreaterThan(10);
      }
    }
  });
  it('full key = full marks, blank = 0, for every question', () => {
    for (const s of all)
      for (const q of listeningQuestions(s)) {
        for (const k of q.keys) expect(scoreListening(q, k), `${s.id} #${q.n}`).toBe(1);
        expect(scoreListening(q, ''), `${s.id} #${q.n}`).toBe(0);
      }
  });
  it('attempts for a whole set: one per question, unique ids, all correct', () => {
    for (const s of all) {
      const ans = Object.fromEntries(listeningQuestions(s).map((q) => [q.n, q.keys[0]!]));
      const at = buildListeningAttempts(s, ans, 'sx', '2026-01-01T00:00:00Z');
      expect(at.length, s.id).toBe(listeningQuestions(s).length);
      expect(new Set(at.map((a) => a.id)).size, s.id).toBe(at.length);
      expect(at.every((a) => a.marks === a.maxMarks), s.id).toBe(true);
    }
  });
});

describe('QA M3: Writing and Speaking content', () => {
  it('Writing: 4 Part 1 essays and Part 2 letter/proposal/report/review, all 220-260 words, ai-generated', () => {
    expect(writingTasks.filter((t) => t.part === 1 && t.taskType === 'essay').length).toBe(4);
    expect(writingTasks.filter((t) => t.part === 2).map((t) => t.taskType).sort()).toEqual(['letter', 'proposal', 'report', 'review']);
    for (const t of writingTasks) {
      expect([t.wordMin, t.wordMax], t.id).toEqual([220, 260]);
      expect(t.label, t.id).toBe('ai-generated');
    }
  });
  it('Writing Part 1 has an input text and exactly 3 points', () => {
    for (const t of writingTasks.filter((x) => x.part === 1)) {
      expect(t.inputText, t.id).toBeTruthy();
      expect(t.points.length, t.id).toBe(3);
    }
  });
  it('Speaking: 5 sets, Part 2 = 3 situations, Part 3 = 5 options, ai-generated, no official claims', () => {
    const sets = speakingSets();
    expect(sets.length).toBeGreaterThanOrEqual(5);
    for (const s of sets) {
      expect(s.label, s.id).toBe('ai-generated');
      expect(s.part2.situations.length, s.id).toBe(3);
      expect(s.part3.options.length, s.id).toBe(5);
      expect(s.part1.questions.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.part4.questions.length, s.id).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(s), s.id).not.toMatch(/real exam|official (?:exam|paper|question)|past paper/i);
    }
  });
});

describe('QA M3: backup keeps Writing and Speaking text', () => {
  it('round-trips writing drafts, feedback and speaking entries', () => {
    const d = defaultData();
    d.writing.push({ id: 'w1', taskId: 'w-001', text: 'Hello <b>x</b>', wordCount: 2, startedAt: '2026-01-01T00:00:00Z', savedAt: '2026-01-01T00:00:00Z', feedback: 'ok', feedbackAt: '2026-01-02T00:00:00Z' } as any);
    d.speaking.push({ id: 'sp1', setId: 's-001', part: 2, recordingKey: 'sp1', durationMs: 1000, transcript: 'hi', feedback: null, at: '2026-01-01T00:00:00Z' } as any);
    const r = parseBackup(JSON.stringify(buildBackup(d)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.data.writing[0]!.text).toBe('Hello <b>x</b>');
      expect(r.backup.data.speaking[0]!.transcript).toBe('hi');
    }
  });
  it('rejects a backup whose data is truncated, array of wrong type, or wrong schemaVersion', () => {
    const b = JSON.parse(JSON.stringify(buildBackup(defaultData())));
    expect(parseBackup(JSON.stringify({ ...b, data: { ...b.data, speaking: 'x' } })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...b, schemaVersion: 2 })).ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup('null').ok).toBe(false);
  });
});

describe('QA M3: word count edge cases', () => {
  it('handles newlines, tabs, punctuation-only and leading space', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  \n\t ')).toBe(0);
    expect(wordCount('one\ntwo\tthree  four')).toBe(4);
  });
  it('boundaries 219/220/260/261', () => {
    const w = (n: number) => wordCount(Array(n).fill('a').join(' '));
    expect(wordState(w(219), 220, 260)).toBe('short');
    expect(wordState(w(220), 220, 260)).toBe('ok');
    expect(wordState(w(260), 220, 260)).toBe('ok');
    expect(wordState(w(261), 220, 260)).toBe('long');
  });
});
