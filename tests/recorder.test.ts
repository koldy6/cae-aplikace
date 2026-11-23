import { describe, expect, test } from 'vitest';
import { checkSupport, ERROR_MESSAGES_CS, mapError, pickMime, startRecording } from '../src/media/recorder';

describe('pickMime', () => {
  test('prefers webm/opus, then webm, then mp4, then default', () => {
    expect(pickMime(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickMime((t) => t === 'audio/webm')).toBe('audio/webm');
    expect(pickMime((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMime(() => false)).toBe('');
  });
});

describe('mapError', () => {
  test.each([
    ['NotAllowedError', 'denied'], ['NotFoundError', 'no-mic'], ['NotReadableError', 'busy'], ['TypeError', 'unknown'],
  ])('%s -> %s', (name, code) => expect(mapError({ name })).toBe(code));
  test('null and non-objects are unknown', () => {
    expect(mapError(null)).toBe('unknown');
    expect(mapError('x')).toBe('unknown');
  });
  test('every code has a Czech message', () => {
    for (const m of Object.values(ERROR_MESSAGES_CS)) expect(m.length).toBeGreaterThan(10);
  });
});

describe('checkSupport / startRecording with fakes', () => {
  const MR: any = class {};
  const gum = async () => ({ getTracks: () => [] }) as any;
  test('insecure beats unsupported', () => {
    expect(checkSupport({ isSecureContext: false })?.code).toBe('insecure');
    expect(checkSupport({ isSecureContext: true })?.code).toBe('unsupported');
    expect(checkSupport({ isSecureContext: true, MediaRecorder: MR, mediaDevices: { getUserMedia: gum } })).toBeNull();
  });
  test('getUserMedia rejection is mapped, never thrown', async () => {
    const reject = (name: string) => async () => { throw Object.assign(new Error('x'), { name }); };
    for (const [name, code] of [['NotAllowedError', 'denied'], ['NotFoundError', 'no-mic'], ['NotReadableError', 'busy']] as [string, string][]) {
      const r = await startRecording({ isSecureContext: true, MediaRecorder: MR, mediaDevices: { getUserMedia: reject(name) } });
      expect(r).toMatchObject({ ok: false, code });
    }
  });
  test('stop returns a blob and releases the tracks', async () => {
    let stopped = 0;
    const stream: any = { getTracks: () => [{ stop: () => stopped++ }] };
    class FakeMR {
      static isTypeSupported = (t: string) => t === 'audio/webm';
      state = 'inactive'; mimeType = 'audio/webm'; ondataavailable: any; onstop: any; onerror: any;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({ data: new Blob(['abc']) }); this.onstop(); }
    }
    const r = await startRecording({ isSecureContext: true, MediaRecorder: FakeMR as any, mediaDevices: { getUserMedia: async () => stream } });
    if (!r.ok) throw new Error('should start');
    const s = await r.recorder.stop();
    expect(s.ok && s.recording.blob.size).toBe(3);
    expect(stopped).toBe(1);
  });
});
