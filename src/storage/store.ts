import { z } from 'zod';
import { MemoryAdapter, type StorageLike } from './memoryAdapter';

export const STORAGE_KEY = 'cae-english:v1';
export const SAVE_DEBOUNCE_MS = 300;

const Marks = z.object({ marks: z.number(), maxMarks: z.number() });

export const SessionSchema = z.object({
  id: z.string(),
  kind: z.enum(['drill', 'retry', 'mock', 'listening']),
  setIds: z.array(z.string()),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  marks: z.number(),
  maxMarks: z.number(),
  perPart: z.record(z.string(), Marks),
});

export const AttemptSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionId: z.string(),
  setId: z.string(),
  paper: z.string(),
  part: z.number(),
  type: z.string(),
  answer: z.string(),
  marks: z.number(),
  maxMarks: z.number(),
  at: z.string(),
  selfMarked: z.boolean().optional(),
});

export const WritingEntrySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  text: z.string(),
  wordCount: z.number(),
  startedAt: z.string(),
  savedAt: z.string(),
  feedback: z.string().nullable(),
  feedbackAt: z.string().nullable(),
});

export const SpeakingEntrySchema = z.object({
  id: z.string(),
  setId: z.string(),
  part: z.number(),
  recordingKey: z.string().nullable(),
  durationMs: z.number(),
  transcript: z.string().nullable(),
  feedback: z.string().nullable(),
  at: z.string(),
});

export const IssueReportSchema = z.object({
  questionId: z.string(),
  note: z.string(),
  at: z.string(),
});

export const SettingsSchema = z.object({
  examDate: z.string().nullable(),
  ttsRate: z.number(),
  ttsVoiceA: z.string().nullable(),
  ttsVoiceB: z.string().nullable(),
  listeningPlayLimit: z.union([z.literal(2), z.null()]),
});

export const AppDataSchema = z.object({
  schemaVersion: z.literal(1),
  settings: SettingsSchema,
  sessions: z.array(SessionSchema),
  attempts: z.array(AttemptSchema),
  writing: z.array(WritingEntrySchema),
  speaking: z.array(SpeakingEntrySchema),
  issues: z.array(IssueReportSchema),
});

export type AppData = z.infer<typeof AppDataSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Attempt = z.infer<typeof AttemptSchema>;
export type WritingEntry = z.infer<typeof WritingEntrySchema>;
export type SpeakingEntry = z.infer<typeof SpeakingEntrySchema>;
export type IssueReport = z.infer<typeof IssueReportSchema>;

export function defaultData(): AppData {
  return {
    schemaVersion: 1,
    settings: { examDate: null, ttsRate: 1, ttsVoiceA: null, ttsVoiceB: null, listeningPlayLimit: 2 },
    sessions: [],
    attempts: [],
    writing: [],
    speaking: [],
    issues: [],
  };
}

/** Parse a raw stored string; any problem (null, bad JSON, bad shape) yields defaults. Never throws. */
export function parseData(raw: string | null): AppData {
  return (raw === null ? null : parseOrNull(raw)) ?? defaultData();
}

function parseOrNull(raw: string): AppData | null {
  try {
    const r = AppDataSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Unreadable data is copied here before defaults overwrite it, so history can be recovered by hand. */
export const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;

export interface Store {
  /** Live data object. Change it only through `update`. */
  get(): AppData;
  /** Mutate data, then schedule a debounced save. */
  update(mutate: (data: AppData) => void): void;
  /** Replace all data (e.g. backup import) and save immediately. */
  replace(data: AppData): void;
  /** Write pending changes now. */
  flush(): void;
  /** True when data are NOT being persisted (quota / private mode); UI shows a banner. */
  readonly memoryMode: boolean;
  /** Called when memoryMode flips to true. */
  onMemoryMode(listener: () => void): void;
}

export function createStore(adapter: StorageLike, debounceMs = SAVE_DEBOUNCE_MS): Store {
  let backend: StorageLike = adapter;
  let memoryMode = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  const listeners: Array<() => void> = [];

  const toMemory = (): void => {
    if (memoryMode) return;
    memoryMode = true;
    backend = new MemoryAdapter();
    listeners.forEach((l) => l());
  };

  let data: AppData;
  try {
    const raw = backend.getItem(STORAGE_KEY);
    const parsed = raw === null ? null : parseOrNull(raw);
    if (raw !== null && parsed === null) backend.setItem(CORRUPT_KEY, raw);
    data = parsed ?? defaultData();
  } catch {
    data = defaultData();
    toMemory();
  }

  const write = (): void => {
    try {
      backend.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // QuotaExceededError, SecurityError (private mode): keep working in memory.
      toMemory();
      backend.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  const flush = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!dirty) return;
    dirty = false;
    write();
  };

  const schedule = (): void => {
    dirty = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  // Do not lose the last change when the tab is closed or hidden.
  if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

  // Best effort: ask the browser not to evict our data. Guarded for Node tests.
  if (typeof navigator !== 'undefined' && typeof navigator.storage?.persist === 'function') {
    void navigator.storage.persist().catch(() => undefined);
  }

  return {
    get: () => data,
    update(mutate) {
      mutate(data);
      schedule();
    },
    replace(next) {
      data = next;
      dirty = true;
      flush();
    },
    flush,
    get memoryMode() {
      return memoryMode;
    },
    onMemoryMode(listener) {
      listeners.push(listener);
    },
  };
}
