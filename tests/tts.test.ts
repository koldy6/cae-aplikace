import { describe, expect, test } from 'vitest';
import {
  createPlayCounter, createPlayer, isSupported, loadVoices, pickVoices, rankVoices, splitText,
  type Segment, type SynthLike,
} from '../src/media/tts';

const v = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

class FakeUtterance {
  voice: unknown; lang = ''; rate = 1; pitch = 1;
  onstart?: () => void; onend?: () => void; onerror?: (e: { error?: string }) => void;
  constructor(public text: string) {}
}
function fakeSynth(voices: SpeechSynthesisVoice[]) {
  const spoken: FakeUtterance[] = [];
  const listeners: Record<string, Array<() => void>> = {};
  const synth = {
    spoken, listeners, voices,
    getVoices: () => synth.voices,
    speak: (u: FakeUtterance) => { spoken.push(u); },
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    addEventListener: (t: string, fn: () => void) => { (listeners[t] ??= []).push(fn); },
    removeEventListener: (t: string, fn: () => void) => { listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn); },
  };
  return synth;
}
const envOf = (s: SynthLike) => ({ synth: s, Utterance: FakeUtterance as never });

describe('rankVoices / pickVoices', () => {
  const list = [v('Hans', 'de-DE'), v('Zira', 'en-US'), v('Sonia Online (Natural)', 'en-GB'), v('Hazel', 'en-GB'), v('Ryan', 'en_GB')];
  test('en-GB first, natural first, drops non-English', () => {
    expect(rankVoices(list).map((x) => x.name)).toEqual(['Sonia Online (Natural)', 'Hazel', 'Ryan', 'Zira']);
  });
  test('saved voices win; B differs from A', () => {
    const c = pickVoices(list, 'Zira', 'Zira');
    expect(c.a?.name).toBe('Zira');
    expect(c.b?.name).not.toBe('Zira');
    expect(c.pitchB).toBe(1);
  });
  test('single voice: same voice, lower pitch', () => {
    const c = pickVoices([v('Hazel', 'en-GB')], null, null);
    expect(c.a).toBe(c.b);
    expect(c.pitchB).toBeLessThan(1);
  });
  test('no English voices', () => {
    expect(pickVoices([v('Hans', 'de-DE')], null, null)).toEqual({ a: null, b: null, pitchB: 1 });
  });
});

describe('splitText', () => {
  test('short text stays one chunk', () => {
    expect(splitText('Hello there. How are you?')).toEqual(['Hello there. How are you?']);
  });
  test('long text splits into chunks under the limit and loses no words', () => {
    const text = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i} of a long monologue.`).join(' ');
    const chunks = splitText(text, 200);
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.every((c) => c.length < 200)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });
  test('one over-long sentence breaks at spaces', () => {
    const text = Array.from({ length: 60 }, () => 'word').join(' ') + '.';
    const chunks = splitText(text, 100);
    expect(chunks.every((c) => c.length < 100)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });
  test('unbreakable text is hard-cut; blank gives none', () => {
    expect(splitText('x'.repeat(450), 200).every((c) => c.length < 200)).toBe(true);
    expect(splitText('   ')).toEqual([]);
  });
});

describe('play counter', () => {
  test('limit 2', () => {
    const c = createPlayCounter(2);
    expect([c.register(), c.register(), c.register()]).toEqual([true, true, false]);
    expect(c.remaining()).toBe(0);
    c.reset();
    expect(c.canPlay()).toBe(true);
  });
  test('unlimited', () => {
    const c = createPlayCounter(null);
    for (let i = 0; i < 50; i++) expect(c.register()).toBe(true);
    expect(c.remaining()).toBeNull();
  });
});

describe('loadVoices', () => {
  test('immediate', async () => {
    expect(await loadVoices(fakeSynth([v('A', 'en-GB')]))).toHaveLength(1);
  });
  test('waits for voiceschanged', async () => {
    const s = fakeSynth([]);
    const p = loadVoices(s, 1000);
    s.voices = [v('A', 'en-GB')];
    s.listeners['voiceschanged']!.forEach((f) => f());
    expect(await p).toHaveLength(1);
  });
  test('times out with empty list; null synth', async () => {
    expect(await loadVoices(fakeSynth([]), 5)).toEqual([]);
    expect(await loadVoices(null)).toEqual([]);
  });
});

describe('player', () => {
  const script: Segment[] = [{ speaker: 'A', text: 'Hello.' }, { speaker: 'B', text: 'Hi there. Nice day.' }];
  const voices = [v('Hazel', 'en-GB'), v('Zira', 'en-US')];

  test('unsupported env reports error without throwing', () => {
    const errs: string[] = [];
    const env = { synth: null, Utterance: null };
    const p = createPlayer({ env, events: { onError: (c) => errs.push(c) } });
    expect(isSupported(env)).toBe(false);
    expect(p.play(script)).toBe(false);
    expect(errs).toEqual(['unsupported']);
  });

  test('no voices: no-voices error, no play consumed', async () => {
    const errs: string[] = [];
    const p = createPlayer({ env: envOf(fakeSynth([])), voiceTimeoutMs: 5, events: { onError: (c) => errs.push(c) } });
    await p.init();
    expect(p.play(script)).toBe(false);
    expect(errs).toEqual(['no-voices']);
    expect(p.counter.used).toBe(0);
  });

  test('speaks per segment with voices A/B, events, and ends', async () => {
    const s = fakeSynth(voices);
    const seen: number[] = [];
    let ended = 0;
    const p = createPlayer({ env: envOf(s), rate: 0.9, events: { onSegment: (i) => seen.push(i), onEnd: () => ended++ } });
    await p.init();
    expect(p.play(script)).toBe(true);
    for (let i = 0; i < 2; i++) { const u = s.spoken[i]!; u.onstart?.(); u.onend?.(); }
    expect(s.spoken.map((u) => u.text)).toEqual(['Hello.', 'Hi there. Nice day.']);
    expect((s.spoken[0]!.voice as SpeechSynthesisVoice).name).toBe('Hazel');
    expect((s.spoken[1]!.voice as SpeechSynthesisVoice).name).toBe('Zira');
    expect(s.spoken[0]!.rate).toBe(0.9);
    expect(seen).toEqual([0, 1]);
    expect(ended).toBe(1);
    expect(p.isPlaying()).toBe(false);
  });

  test('enforces the play limit; stop ignores stale callbacks', async () => {
    const s = fakeSynth(voices);
    const errs: string[] = [];
    let ended = 0;
    const p = createPlayer({ env: envOf(s), limit: 2, events: { onError: (c) => errs.push(c), onEnd: () => ended++ } });
    await p.init();
    expect(p.play(script)).toBe(true);
    const first = s.spoken[0]!;
    p.stop();
    first.onend?.(); // stale
    expect(s.spoken).toHaveLength(1);
    expect(ended).toBe(0);
    expect(p.play(script)).toBe(true);
    expect(p.play(script)).toBe(false);
    expect(errs).toEqual(['limit']);
    p.setLimit(null);
    expect(p.play(script)).toBe(true);
  });

  test('speech error is reported, cancel errors are not', async () => {
    const s = fakeSynth(voices);
    const errs: string[] = [];
    const p = createPlayer({ env: envOf(s), events: { onError: (c) => errs.push(c) } });
    await p.init();
    p.play(script);
    s.spoken[0]!.onerror?.({ error: 'canceled' });
    expect(errs).toEqual([]);
    s.spoken[0]!.onerror?.({ error: 'synthesis-failed' });
    expect(errs).toEqual(['speech']);
  });
});
