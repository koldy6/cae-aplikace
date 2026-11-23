import { describe, expect, it } from 'vitest';
import { extForMime, recButtonState } from '../src/media/recorder';
import { previewOf, buildBackup, needsBackupReminder } from '../src/storage/backup';
import { canLeave } from '../src/ui/router';
import { defaultData } from '../src/storage/store';

describe('extForMime', () => {
  it('follows the recording mime', () => {
    expect(extForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extForMime('audio/mp4')).toBe('mp4');
    expect(extForMime('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extForMime('')).toBe('webm');
  });
});

describe('recButtonState (one recorder per screen)', () => {
  it('is idle for everyone when nothing records', () => {
    expect([1, 2, 3, 4].map((p) => recButtonState(undefined, false, p))).toEqual(['idle', 'idle', 'idle', 'idle']);
  });
  it('locks the other parts and keeps the owner right', () => {
    expect(recButtonState(1, true, 1)).toBe('recording');
    expect(recButtonState(1, true, 2)).toBe('locked');
    expect(recButtonState(1, false, 1)).toBe('pending'); // permission prompt open: double click ignored
    expect(recButtonState(1, false, 3)).toBe('locked');
  });
});

describe('canLeave', () => {
  it('allows without a guard, otherwise follows the guard', () => {
    expect(canLeave(undefined)).toBe(true);
    expect(canLeave(() => false)).toBe(false);
    expect(canLeave(() => true)).toBe(true);
  });
});

describe('backup counts Speaking', () => {
  it('preview and reminder include speaking entries', () => {
    const d = defaultData();
    d.speaking.push({ id: 'x', setId: 's', part: 1, recordingKey: null, durationMs: 0, transcript: 't', feedback: null, at: new Date().toISOString() });
    expect(previewOf(buildBackup(d)).speaking).toBe(1);
    expect(needsBackupReminder(d)).toBe(true);
  });
});
