import { schemaFor } from './schema';
import type { ContentSet, FormatReference, ListeningSet, WritingTask } from './types';

// Bundled content was validated by tests/content.test.ts, so it is trusted here.
// Files whose paper/part has no schema yet (e.g. reference/format.json) are skipped.
const files = import.meta.glob('./data/**/*.json', { eager: true, import: 'default' });

export type ContentIndex = Record<string, Record<number, ContentSet[]>>;

export function buildIndex(raws: unknown[]): ContentIndex {
  const index: ContentIndex = {};
  for (const raw of raws) {
    if (!schemaFor(raw) || ['writing', 'reference'].includes((raw as { paper: string }).paper)) continue; // these have their own accessors
    const set = raw as ContentSet; // listening sets are read via listeningSets()
    ((index[set.paper] ??= {})[set.part] ??= []).push(set);
  }
  return index;
}

export const content: ContentIndex = buildIndex(Object.values(files));

export const setsFor = (paper: string, part: number): ContentSet[] => (content[paper]?.[part] ?? []) as ContentSet[];
export const listeningSets = (part: number): ListeningSet[] => (content.listening?.[part] ?? []) as unknown as ListeningSet[];

export const listeningById = (id: string): ListeningSet | undefined => Object.values(content.listening ?? {}).flat().find((s) => s.id === id) as unknown as ListeningSet | undefined;

export const setById = (id: string): ContentSet | undefined =>
  Object.values(content).flatMap((parts) => Object.values(parts).flat()).find((s) => s.id === id);

const all = Object.values(files) as { paper?: string; id?: string }[];
export const writingTasks: WritingTask[] = (all.filter((r) => r.paper === 'writing') as WritingTask[]).sort((a, b) => a.part - b.part || a.id.localeCompare(b.id));
export const writingById = (id: string): WritingTask | undefined => writingTasks.find((t) => t.id === id);
/** The real `format` file wins over any placeholder. */
export const formatReference = (): FormatReference | undefined => {
  const refs = all.filter((r) => r.paper === 'reference') as FormatReference[];
  return refs.find((r) => r.id === 'format') ?? refs[0];
};
