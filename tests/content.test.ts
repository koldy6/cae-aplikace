import { z } from 'zod';
import { describe, expect, test } from 'vitest';
import { schemaFor } from '../src/content/schema';
import { buildIndex, content } from '../src/content/loader';
import { kwtWordCount } from '../src/content/schema';

// Raw file text keyed by path; no Node typings needed (no new dependency).
const glob = (m: Record<string, unknown>) => m as Record<string, string>;
const REAL = glob(import.meta.glob('../src/content/data/**/*.json', { query: '?raw', import: 'default', eager: true }));
const FIXTURES = glob(import.meta.glob('./fixtures/**/*.json', { query: '?raw', import: 'default', eager: true }));
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1);
const pick = (m: Record<string, string>, ...names: string[]) =>
  names.map((n) => {
    const path = Object.keys(m).find((p) => p.endsWith('/' + n));
    if (!path) throw new Error('missing ' + n);
    return path;
  });

const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

// SPEC 7 / CONTENT_GUIDE 7. Strict list only in title/topic; the three exact phrases everywhere.
const TITLE_WORDS = /\b(official|authentic|past paper|real exam|real test|actual exam question|cambridge-approved|endorsed by cambridge)\b/i;
const ANYWHERE = /official cambridge question|real exam|authentic exam/i;

/** All problems found in the given files, each message starting with the file name. */
function validate(paths: string[], files: Record<string, string>): string[] {
  const errors: string[] = [];
  const ids = new Map<string, string>();
  for (const path of paths) {
    const name = basename(path);
    const err = (m: string) => errors.push(`${name}: ${m}`);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(files[path] ?? '');
    } catch (e) {
      err(`invalid JSON (${(e as Error).message})`);
      continue;
    }
    const schema = schemaFor(raw);
    if (schema) {
      const r = schema.safeParse(raw);
      if (!r.success) err(z.prettifyError(r.error));
    } else if (raw.paper) err(`no schema for paper=${raw.paper} part=${raw.part}`);
    else continue; // not a content set (e.g. reference/format.json)

    const id = String(raw.id);
    if (name !== `${id}.json`) err(`file name must equal id "${id}"`);
    const first = ids.get(id);
    if (first) err(`duplicate id "${id}" (also in ${first})`);
    else ids.set(id, name);

    const all = strings(raw);
    if (all.some((s) => /[<>]/.test(s))) err('contains "<" or ">" (plain text only, no HTML)');
    if (raw.label === 'ai-generated') {
      const hit = all.find((s) => ANYWHERE.test(s));
      if (hit) err(`forbidden wording in "${hit}"`);
    }
    for (const f of ['title', 'topic'] as const) {
      const m = String(raw[f]).match(TITLE_WORDS);
      if (m) err(`forbidden wording "${m[0]}" in ${f}`);
    }
  }
  return errors;
}

describe('content data', () => {
  const real = Object.keys(REAL);

  test('there is sample content for every implemented part', () => {
    for (const part of [1, 2, 3, 4, 7]) expect(content.rue?.[part]?.length, `rue part ${part}`).toBeGreaterThan(0);
  });

  test('every content file passes the schema and global checks', () => {
    expect(validate(real, REAL)).toEqual([]);
  });

  test('loader groups sets by paper and part', () => {
    expect(content.rue?.[1]?.map((s) => s.id)).toEqual(['sample-rue1-001']);
    expect(buildIndex([{ paper: 'rue', part: 99 }, { reference: true }])).toEqual({});
  });
});

describe('broken fixtures fail with a readable message naming the file', () => {
  const cases: [string, RegExp][] = [
    ['bad-three-options', /options/],
    ['bad-seven-gaps', /gaps \[\[1\]\]\.\.\[\[8\]\]/],
    ['bad-kwt-no-keyword', /must contain the key word UNLESS/],
    ['bad-two-word-answer', /exactly one word/],
    ['bad-html-tag', /"<" or ">"/],
    ['bad-real-exam-wording', /forbidden wording/],
    ['bad-unknown-tag', /made-up-tag|Invalid option/],
    ['bad-kwt-key-alone', /only the key word/],
    ['bad-p7-duplicate-answer', /6 different paragraphs/],
    ['bad-p3-answer-equals-stem', /differ from the stem/],
  ];
  test.each(cases)('%s', (name, re) => {
    const errors = validate(pick(FIXTURES, `${name}.json`), FIXTURES);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.startsWith(`${name}.json: `))).toBe(true);
    expect(errors.join('\n')).toMatch(re);
  });

  test('duplicate id across files', () => {
    const errors = validate([...pick(REAL, 'sample-rue1-001.json'), ...pick(FIXTURES, 'dup-of-sample.json')], { ...REAL, ...FIXTURES });
    expect(errors.join('\n')).toMatch(/dup-of-sample\.json: duplicate id "sample-rue1-001" \(also in sample-rue1-001\.json\)/);
  });

  test('fixtures are not under src/content/data (the loader never sees them)', () => {
    expect(Object.keys(REAL).some((p) => p.includes('fixtures'))).toBe(false);
  });
});

describe('kwtWordCount (assumption A7)', () => {
  test('contractions count as 2', () => {
    expect(kwtWordCount('unless you promise')).toBe(3);
    expect(kwtWordCount("he'd never")).toBe(3);
    expect(kwtWordCount('can’t   stand')).toBe(3);
  });
});
