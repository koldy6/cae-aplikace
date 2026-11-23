// speechSynthesis player: UI-free. Speaks a script segment by segment (Chrome cuts long utterances).

export interface Segment { speaker: 'A' | 'B' | 'N'; text: string }
export type PlayLimit = 2 | null;
export type TtsError = 'unsupported' | 'no-voices' | 'limit' | 'speech';

export interface TtsEvents {
  onSegment?: (index: number, segment: Segment) => void;
  onEnd?: () => void;
  onError?: (code: TtsError) => void;
}

/** Minimal slice of speechSynthesis, so tests can pass a fake. */
export interface SynthLike {
  speak(u: any): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  getVoices(): SpeechSynthesisVoice[];
  addEventListener?(type: string, fn: () => void): void;
  removeEventListener?(type: string, fn: () => void): void;
}
export interface TtsEnv { synth: SynthLike | null; Utterance: (new (text: string) => any) | null }

export const MAX_CHUNK = 190;
export const PITCH_B_FALLBACK = 0.8;

/** Real browser environment; `?nospeech` forces the unsupported path. */
export function browserEnv(): TtsEnv {
  const g = globalThis as any;
  const off = typeof location !== 'undefined' && new URLSearchParams(location.search).has('nospeech');
  if (off || !g.speechSynthesis || !g.SpeechSynthesisUtterance) return { synth: null, Utterance: null };
  return { synth: g.speechSynthesis, Utterance: g.SpeechSynthesisUtterance };
}
export const isSupported = (env: TtsEnv = browserEnv()) => !!env.synth && !!env.Utterance;

// ---- pure logic ----

type V = Pick<SpeechSynthesisVoice, 'name' | 'lang'>;
const lang = (v: V) => v.lang.replace('_', '-').toLowerCase();

/** en-GB first, then other en-*; natural/online voices before others; stable otherwise. Non-English dropped. */
export function rankVoices<T extends V>(voices: readonly T[]): T[] {
  const score = (v: T) => (lang(v) === 'en-gb' ? 0 : 10) + (/natural|online/i.test(v.name) ? 0 : 1);
  return voices
    .filter((v) => lang(v).startsWith('en'))
    .map((v, i) => ({ v, i, s: score(v) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.v);
}

export interface VoiceChoice<T> { a: T | null; b: T | null; pitchB: number }

/** Saved names win when still installed; B must differ from A, else same voice with lower pitch. */
export function pickVoices<T extends V>(voices: readonly T[], savedA: string | null, savedB: string | null): VoiceChoice<T> {
  const ranked = rankVoices(voices);
  const a = ranked.find((v) => v.name === savedA) ?? ranked[0] ?? null;
  const b = ranked.find((v) => v.name === savedB && v !== a) ?? ranked.find((v) => v !== a) ?? null;
  return b ? { a, b, pitchB: 1 } : { a, b: a, pitchB: a ? PITCH_B_FALLBACK : 1 };
}

/** Split into sentence chunks shorter than max; over-long sentences break at commas/spaces. */
export function splitText(text: string, max = MAX_CHUNK): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?…]+(?:[.!?…]+["')\]]*|$)/g) ?? [];
  const out: string[] = [];
  let cur = '';
  const push = (s: string) => { if (s) out.push(s); };
  for (let s of sentences.map((x) => x.trim()).filter(Boolean)) {
    while (s.length >= max) {
      let cut = s.lastIndexOf(', ', max - 2);
      if (cut < max / 3) cut = s.lastIndexOf(' ', max - 2);
      if (cut <= 0) cut = max - 2; // no break point: hard cut
      push(cur); cur = '';
      push(s.slice(0, cut + 1).trim());
      s = s.slice(cut + 1).trim();
    }
    if (cur && cur.length + 1 + s.length < max) cur += ' ' + s;
    else { push(cur); cur = s; }
  }
  push(cur);
  return out;
}

export interface PlayCounter {
  readonly used: number;
  readonly limit: PlayLimit;
  canPlay(): boolean;
  register(): boolean;
  remaining(): number | null;
  reset(): void;
}

export function createPlayCounter(limit: PlayLimit): PlayCounter {
  let used = 0;
  return {
    get used() { return used; },
    limit,
    canPlay: () => limit === null || used < limit,
    register() { if (limit !== null && used >= limit) return false; used++; return true; },
    remaining: () => (limit === null ? null : Math.max(0, limit - used)),
    reset() { used = 0; },
  };
}

const safeVoices = (s: SynthLike) => { try { return s.getVoices() ?? []; } catch { return []; } };

/** Resolve voices once loaded: `voiceschanged` or timeout (some browsers never fire it). */
export function loadVoices(synth: SynthLike | null, timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  const now = safeVoices(synth);
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(safeVoices(synth));
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener?.('voiceschanged', finish);
  });
}

// ---- player ----

export interface PlayerOptions {
  env?: TtsEnv;
  limit?: PlayLimit;
  rate?: number;
  voiceA?: string | null;
  voiceB?: string | null;
  events?: TtsEvents;
  voiceTimeoutMs?: number;
}

export interface Player {
  readonly supported: boolean;
  readonly counter: PlayCounter;
  /** Resolves with ranked English voices; empty when none. Safe to call when unsupported. */
  init(): Promise<SpeechSynthesisVoice[]>;
  voices(): SpeechSynthesisVoice[];
  setRate(rate: number): void;
  setVoices(a: string | null, b: string | null): void;
  /** Keeps the plays already used. */
  setLimit(limit: PlayLimit): void;
  /** Start from the beginning; consumes one play. False when unsupported, no voices or limit reached. */
  play(script: Segment[]): boolean;
  pause(): void;
  resume(): void;
  /** Stop and drop the current run (the play is not refunded). */
  stop(): void;
  isPlaying(): boolean;
}

export function createPlayer(opts: PlayerOptions = {}): Player {
  const env = opts.env ?? browserEnv();
  const events = opts.events ?? {};
  let counter = createPlayCounter(opts.limit === undefined ? 2 : opts.limit);
  let rate = opts.rate ?? 1;
  let saved: [string | null, string | null] = [opts.voiceA ?? null, opts.voiceB ?? null];
  let voices: SpeechSynthesisVoice[] = [];
  let run = 0; // stale-callback guard
  let playing = false;
  const supported = isSupported(env);
  const fail = (c: TtsError) => { try { events.onError?.(c); } catch { /* UI callback must not break playback */ } };

  const speakChunks = (script: Segment[], id: number) => {
    const { a, b, pitchB } = pickVoices(voices, saved[0], saved[1]);
    const queue = script.flatMap((seg, index) => splitText(seg.text).map((text, k) => ({ seg, index, text, first: k === 0 })));
    const next = (i: number) => {
      if (id !== run) return;
      const item = queue[i];
      if (!item) { playing = false; events.onEnd?.(); return; }
      const u = new env.Utterance!(item.text);
      const isB = item.seg.speaker === 'B';
      const voice = isB ? b : a;
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-GB';
      u.rate = rate;
      u.pitch = isB ? pitchB : 1;
      u.onstart = () => { if (id === run && item.first) events.onSegment?.(item.index, item.seg); };
      u.onend = () => next(i + 1);
      u.onerror = (e: { error?: string }) => {
        if (id !== run || e?.error === 'canceled' || e?.error === 'interrupted') return;
        playing = false; run++; fail('speech');
      };
      try { env.synth!.speak(u); } catch { playing = false; run++; fail('speech'); }
    };
    next(0);
  };

  return {
    supported,
    get counter() { return counter; },
    async init() {
      if (!supported) return [];
      voices = rankVoices(await loadVoices(env.synth, opts.voiceTimeoutMs));
      return voices;
    },
    voices: () => voices,
    setRate(r) { rate = r; },
    setVoices(a, b) { saved = [a, b]; },
    setLimit(l) {
      const used = counter.used;
      counter = createPlayCounter(l);
      for (let i = 0; i < used; i++) counter.register();
    },
    play(script) {
      if (!supported) { fail('unsupported'); return false; }
      if (!voices.length) voices = rankVoices(safeVoices(env.synth!)); // init() may not have run
      if (!voices.length) { fail('no-voices'); return false; }
      if (!counter.register()) { fail('limit'); return false; }
      env.synth!.cancel();
      const id = ++run;
      playing = true;
      speakChunks(script, id);
      return true;
    },
    pause() { if (playing) env.synth?.pause(); },
    resume() { if (playing) env.synth?.resume(); },
    stop() { run++; playing = false; try { env.synth?.cancel(); } catch { /* ignore */ } },
    isPlaying: () => playing,
  };
}
