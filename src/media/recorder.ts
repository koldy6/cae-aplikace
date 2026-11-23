// MediaRecorder wrapper: UI-free. Never throws; failures come back as { ok: false, code, message }.

export type RecorderError = 'insecure' | 'unsupported' | 'denied' | 'no-mic' | 'busy' | 'unknown';

export const ERROR_MESSAGES_CS: Record<RecorderError, string> = {
  insecure: 'Mikrofon funguje jen na zabezpečeném spojení (https nebo localhost). Na telefonu přes http nahrávání nejde; použijte počítač nebo https.',
  unsupported: 'Tento prohlížeč nahrávání zvuku nepodporuje. Zkuste Chrome nebo Edge.',
  denied: 'Přístup k mikrofonu je zamítnut. Povolte mikrofon v nastavení webu (ikona zámku u adresy) a zkuste to znovu.',
  'no-mic': 'Nebyl nalezen žádný mikrofon. Připojte mikrofon a zkuste to znovu.',
  busy: 'Mikrofon používá jiná aplikace nebo se ho nepodařilo otevřít. Zavřete ostatní aplikace a zkuste to znovu.',
  unknown: 'Nahrávání se nepodařilo. Zkuste to prosím znovu.',
};

export type Fail = { ok: false; code: RecorderError; message: string };
const fail = (code: RecorderError): Fail => ({ ok: false, code, message: ERROR_MESSAGES_CS[code] });

export const MIME_PREFERENCE = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const;

/** First supported mime from the preference list; '' means "let the browser choose". */
export function pickMime(isTypeSupported: (t: string) => boolean): string {
  return MIME_PREFERENCE.find((t) => isTypeSupported(t)) ?? '';
}

/** File extension matching a recorded blob's mime (Safari records audio/mp4). */
export const extForMime = (mime: string): string => (/mp4/i.test(mime) ? 'mp4' : /ogg/i.test(mime) ? 'ogg' : 'webm');

export type RecButtonState = 'idle' | 'recording' | 'locked' | 'pending';
/** One recorder per screen: `owner` is the part that holds it (set on click, before the permission prompt resolves). */
export function recButtonState(owner: number | undefined, hasRecorder: boolean, part: number): RecButtonState {
  if (owner === undefined) return 'idle';
  if (owner !== part) return 'locked';
  return hasRecorder ? 'recording' : 'pending';
}

/** Maps a getUserMedia / MediaRecorder exception to an error code. */
export function mapError(e: unknown): RecorderError {
  switch ((e as { name?: string } | null)?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'no-mic';
    case 'NotReadableError':
    case 'AbortError':
      return 'busy';
    default:
      return 'unknown';
  }
}

export interface RecorderEnv {
  isSecureContext: boolean;
  mediaDevices?: { getUserMedia(c: MediaStreamConstraints): Promise<MediaStream> };
  MediaRecorder?: typeof MediaRecorder;
}
export const browserEnv = (): RecorderEnv => {
  const g = globalThis as any;
  return { isSecureContext: !!g.isSecureContext, mediaDevices: g.navigator?.mediaDevices, MediaRecorder: g.MediaRecorder };
};

/** null when recording can work; otherwise the reason. Insecure is checked first: phones expose no mediaDevices over http. */
export function checkSupport(env: RecorderEnv = browserEnv()): Fail | null {
  if (!env.isSecureContext) return fail('insecure');
  if (!env.MediaRecorder || !env.mediaDevices?.getUserMedia) return fail('unsupported');
  return null;
}

export interface Recording { blob: Blob; durationMs: number; mime: string }
export interface ActiveRecorder { stop(): Promise<{ ok: true; recording: Recording } | Fail> }

/** Asks for the mic and starts recording. Call stop() to get the Blob; tracks are always released. */
export async function startRecording(env: RecorderEnv = browserEnv()): Promise<{ ok: true; recorder: ActiveRecorder } | Fail> {
  const bad = checkSupport(env);
  if (bad) return bad;
  let stream: MediaStream | undefined;
  const release = () => stream?.getTracks().forEach((t) => t.stop());
  try {
    stream = await env.mediaDevices!.getUserMedia({ audio: true });
    const MR = env.MediaRecorder!;
    const mime = pickMime((t) => MR.isTypeSupported?.(t) ?? false);
    const rec = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
    const chunks: Blob[] = [];
    let error: unknown;
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onerror = (e) => { error = (e as any).error ?? e; };
    const t0 = Date.now();
    rec.start();
    return {
      ok: true,
      recorder: {
        stop: () =>
          new Promise((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              release();
              const type = rec.mimeType || mime;
              resolve(error || !chunks.length ? fail(error ? mapError(error) : 'unknown') : { ok: true, recording: { blob: new Blob(chunks, { type }), durationMs: Date.now() - t0, mime: type } });
            };
            rec.onstop = finish;
            try {
              if (rec.state === 'inactive') finish();
              else rec.stop();
            } catch (e) {
              release();
              done = true;
              resolve(fail(mapError(e)));
            }
          }),
      },
    };
  } catch (e) {
    release();
    return fail(mapError(e));
  }
}
