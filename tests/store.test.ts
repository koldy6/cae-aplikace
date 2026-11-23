import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryAdapter, type StorageLike } from '../src/storage/memoryAdapter';
import { CORRUPT_KEY, STORAGE_KEY, createStore, defaultData } from '../src/storage/store';

const attempt = {
  id: 'a1', sessionId: 's1', questionId: 'q1', setId: 'rue1-001', paper: 'rue', part: 1,
  type: 'vocab', answer: 'B', marks: 1, maxMarks: 1, at: '2026-01-01T00:00:00Z',
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('store', () => {
  it('returns defaults on empty storage', () => {
    const s = createStore(new MemoryAdapter());
    expect(s.get()).toEqual(defaultData());
    expect(s.memoryMode).toBe(false);
  });

  it('round-trips data through the adapter', () => {
    const a = new MemoryAdapter();
    const s = createStore(a);
    s.update((d) => {
      d.attempts.push(attempt);
      d.settings.examDate = '2026-12-01';
    });
    s.flush();
    const s2 = createStore(a);
    expect(s2.get().attempts).toEqual([attempt]);
    expect(s2.get().settings.examDate).toBe('2026-12-01');
  });

  it.each(['{not json', '[]', '{"schemaVersion":2}', '{"schemaVersion":1,"attempts":"x"}'])(
    'corrupt data %s gives defaults without throwing',
    (raw) => {
      const a = new MemoryAdapter();
      a.setItem(STORAGE_KEY, raw);
      expect(() => createStore(a)).not.toThrow();
      expect(createStore(a).get()).toEqual(defaultData());
      expect(a.getItem(CORRUPT_KEY)).toBe(raw); // history kept for manual recovery
    },
  );

  it('quota error on save sets memoryMode and keeps data', () => {
    const quota: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
      removeItem: () => undefined,
    };
    const s = createStore(quota);
    const listener = vi.fn();
    s.onMemoryMode(listener);
    s.update((d) => { d.attempts.push(attempt); });
    expect(() => s.flush()).not.toThrow();
    expect(s.memoryMode).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.get().attempts).toHaveLength(1);
  });

  it('unavailable storage on load (private mode) starts in memoryMode', () => {
    const blocked: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => undefined,
    };
    const s = createStore(blocked);
    expect(s.memoryMode).toBe(true);
    expect(s.get()).toEqual(defaultData());
  });

  it('debounces saves and writes once with the latest data', () => {
    const a = new MemoryAdapter();
    const spy = vi.spyOn(a, 'setItem');
    const s = createStore(a, 300);
    s.update((d) => { d.settings.ttsRate = 1.1; });
    vi.advanceTimersByTime(200);
    s.update((d) => { d.settings.ttsRate = 1.2; });
    vi.advanceTimersByTime(200);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(createStore(a).get().settings.ttsRate).toBe(1.2);
  });
});
