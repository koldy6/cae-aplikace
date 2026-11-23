import { describe, expect, it } from 'vitest';
import {
  MAX_BACKUP_BYTES,
  backupFileName,
  buildBackup,
  needsBackupReminder,
  parseBackup,
  previewOf,
} from '../src/storage/backup';
import { MemoryAdapter } from '../src/storage/memoryAdapter';
import { AppDataSchema, createStore, defaultData } from '../src/storage/store';

const session = (id: string, startedAt: string) => ({
  id, kind: 'drill' as const, setIds: ['s'], startedAt, finishedAt: null, marks: 1, maxMarks: 2, perPart: {},
});
const attempt = {
  id: 'a1', sessionId: 's1', questionId: 'q1', setId: 'rue1-001', paper: 'rue', part: 1,
  type: 'vocab', answer: 'B', marks: 1, maxMarks: 1, at: '2026-01-01T00:00:00Z',
};
const filled = () => {
  const d = defaultData();
  d.sessions.push(session('s1', '2026-03-05T10:00:00Z'), session('s2', '2026-02-01T10:00:00Z'));
  d.attempts.push(attempt);
  return d;
};

describe('backup', () => {
  it('round-trips through JSON into a store', () => {
    const d = filled();
    const r = parseBackup(JSON.stringify(buildBackup(d)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const store = createStore(new MemoryAdapter());
    store.replace(r.backup.data);
    expect(store.get()).toEqual(d);
  });

  it('computes preview counts and date range', () => {
    const r = parseBackup(JSON.stringify(buildBackup(filled())));
    if (!r.ok) throw new Error('parse failed');
    const p = previewOf(r.backup);
    expect([p.sessions, p.attempts, p.writing, p.from, p.to]).toEqual([2, 1, 0, '2026-02-01', '2026-03-05']);
  });

  const bad: Array<[string, string, number?]> = [
    ['invalid JSON', '{nope'],
    ['wrong shape', JSON.stringify({ app: 'cae-english', schemaVersion: 1, exportedAt: 'x', data: { sessions: 5 } })],
    ['wrong app id', JSON.stringify({ ...buildBackup(defaultData()), app: 'other' })],
    ['not an object', '42'],
    ['too large', JSON.stringify(buildBackup(defaultData())), MAX_BACKUP_BYTES + 1],
  ];
  it.each(bad)('rejects %s with a Czech error and leaves data unchanged', (_n, text, size) => {
    const store = createStore(new MemoryAdapter());
    store.replace(filled());
    const before = JSON.stringify(store.get());
    const r = parseBackup(text, size);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    expect(JSON.stringify(store.get())).toBe(before);
  });

  it('still parses old data without lastBackupAt', () => {
    const old = defaultData();
    expect(old.settings.lastBackupAt).toBeUndefined();
    expect(AppDataSchema.safeParse(JSON.parse(JSON.stringify(old))).success).toBe(true);
  });

  it('reminds only with data and no export in 7 days', () => {
    const now = new Date('2026-03-10T00:00:00Z');
    expect(needsBackupReminder(defaultData(), now)).toBe(false);
    const d = filled();
    expect(needsBackupReminder(d, now)).toBe(true);
    d.settings.lastBackupAt = '2026-03-08T00:00:00Z';
    expect(needsBackupReminder(d, now)).toBe(false);
    d.settings.lastBackupAt = '2026-03-01T00:00:00Z';
    expect(needsBackupReminder(d, now)).toBe(true);
  });

  it('names the file with the date', () => {
    expect(backupFileName(new Date('2026-03-10T12:00:00Z'))).toBe('cae-english-zaloha-2026-03-10.json');
  });
});
