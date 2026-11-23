import { schemaFor } from './schema';
import type { ContentSet, ListeningSet } from './types';

// Bundled content was validated by tests/content.test.ts, so it is trusted here.
// Files whose paper/part has no schema yet (e.g. reference/format.json) are skipped.
const files = import.meta.glob('./data/**/*.json', { eager: true, import: 'default' });

export type ContentIndex = Record<string, Record<number, ContentSet[]>>;

export function buildIndex(raws: unknown[]): ContentIndex {
  const index: ContentIndex = {};
  for (const raw of raws) {
    if (!schemaFor(raw)) continue;
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
