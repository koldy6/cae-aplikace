import { z } from 'zod';
import { RUE_TAGS } from './tags';

// ---- helpers -------------------------------------------------------------
const str = z.string().min(1);
const letter4 = z.enum(['A', 'B', 'C', 'D']);
const explanation = z.strictObject({ en: str, cs: str });

export const gapNumbers = (text: string): number[] =>
  [...text.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1])).filter((n) => n > 0);

export const norm = (s: string): string =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

// Assumption A7: contractions count as 2 words.
export const kwtWordCount = (s: string): number =>
  norm(s)
    .split(' ')
    .filter(Boolean)
    .reduce((n, w) => n + (/'(s|d|ll|ve|re|m|t)$/.test(w) ? 2 : 1), 0);

type Ctx = z.RefinementCtx;
const fail = (ctx: Ctx, message: string, path: (string | number)[] = []) =>
  ctx.addIssue({ code: 'custom', message, path });

const oneWord = (s: string) => /^\S+$/.test(s);

/** Gaps in `text` must be exactly 1..N and match question numbers 1..N in order. */
function checkGaps(ctx: Ctx, text: string, ns: number[], count: number) {
  const gaps = gapNumbers(text);
  const want = Array.from({ length: count }, (_, i) => i + 1);
  if (gaps.length !== count || gaps.some((g, i) => g !== want[i]))
    fail(ctx, `text must contain gaps [[1]]..[[${count}]] in order, found: ${gaps.join(',') || 'none'}`, ['text']);
  if (ns.length !== count || ns.some((n, i) => n !== want[i]))
    fail(ctx, `question numbers must be 1..${count} in order, found: ${ns.join(',')}`, ['questions']);
}

// ---- common fields (ARCHITECTURE 5.2) ------------------------------------
const common = {
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase letters, digits and hyphens'),
  label: z.enum(['ai-generated', 'official-format-reference']),
  source: z.strictObject({ url: z.url(), readOn: z.iso.date() }).nullable(),
  title: str,
  topic: str,
  difficulty: z.number().int().min(1).max(3).optional(),
  reviewed: z.boolean(),
};

function checkSource(ctx: Ctx, v: { label: string; source: unknown }) {
  if (v.label === 'official-format-reference' && !v.source)
    fail(ctx, 'label official-format-reference requires source {url, readOn}', ['source']);
}

const rueBase = { ...common, paper: z.literal('rue') };

// ---- Part 1 ---------------------------------------------------------------
const p1q = z.strictObject({
  n: z.number().int(),
  options: z.strictObject({ A: str, B: str, C: str, D: str }),
  answer: letter4,
  type: z.enum(RUE_TAGS[1]),
  explanation,
});
export const rue1Schema = z
  .strictObject({ ...rueBase, part: z.literal(1), text: str, questions: z.array(p1q).length(8) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkGaps(ctx, v.text, v.questions.map((q) => q.n), 8);
    v.questions.forEach((q, i) => {
      if (new Set(Object.values(q.options).map(norm)).size !== 4)
        fail(ctx, `question ${q.n}: the 4 options must be distinct`, ['questions', i, 'options']);
    });
  });

// ---- Part 2 ---------------------------------------------------------------
const p2q = z.strictObject({
  n: z.number().int(),
  answers: z.array(str).min(1),
  type: z.enum(RUE_TAGS[2]),
  explanation,
});
export const rue2Schema = z
  .strictObject({ ...rueBase, part: z.literal(2), text: str, questions: z.array(p2q).length(8) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkGaps(ctx, v.text, v.questions.map((q) => q.n), 8);
    v.questions.forEach((q, i) =>
      q.answers.forEach((a, j) => {
        if (!oneWord(a)) fail(ctx, `question ${q.n}: answer "${a}" must be exactly one word`, ['questions', i, 'answers', j]);
      }),
    );
  });

// ---- Part 3 ---------------------------------------------------------------
const p3q = z.strictObject({
  n: z.number().int(),
  stem: z.string().regex(/^[A-Z]+$/, 'stem must be one uppercase word'),
  answers: z.array(str).min(1),
  type: z.enum(RUE_TAGS[3]),
  explanation,
});
export const rue3Schema = z
  .strictObject({ ...rueBase, part: z.literal(3), text: str, questions: z.array(p3q).length(8) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkGaps(ctx, v.text, v.questions.map((q) => q.n), 8);
    v.questions.forEach((q, i) =>
      q.answers.forEach((a, j) => {
        const path = ['questions', i, 'answers', j];
        if (!oneWord(a)) fail(ctx, `question ${q.n}: answer "${a}" must be exactly one word`, path);
        else if (norm(a) === norm(q.stem)) fail(ctx, `question ${q.n}: answer "${a}" must differ from the stem`, path);
      }),
    );
  });

// ---- Part 4 (key word transformation) -------------------------------------
const p4item = z.strictObject({
  n: z.number().int(),
  sentence1: str,
  keyWord: z.string().regex(/^[A-Z]+$/, 'keyWord must be one uppercase word'),
  before: z.string(),
  after: z.string(),
  parts: z.tuple([
    z.strictObject({ accepted: z.array(str).min(1) }),
    z.strictObject({ accepted: z.array(str).min(1) }),
  ]),
  fullAnswers: z.array(str).min(1),
  type: z.enum(RUE_TAGS[4]),
  explanation,
});
const hasPhrase = (full: string, phrase: string) => ` ${norm(full)} `.includes(` ${norm(phrase)} `);

export const rue4Schema = z
  .strictObject({ ...rueBase, part: z.literal(4), items: z.array(p4item).length(6) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    v.items.forEach((it, i) => {
      const at = (...p: (string | number)[]) => ['items', i, ...p];
      if (it.n !== i + 1) fail(ctx, `item numbers must be 1..6 in order, item ${i + 1} has n=${it.n}`, at('n'));
      const key = it.keyWord.toLowerCase();
      it.parts.forEach((p, k) =>
        p.accepted.forEach((a, j) => {
          if (norm(a) === key)
            fail(ctx, `item ${it.n}: part ${k + 1} "${a}" is only the key word; combine it with the words around it`, at('parts', k, 'accepted', j));
        }),
      );
      it.fullAnswers.forEach((full, j) => {
        const words = kwtWordCount(full);
        if (words < 3 || words > 6) fail(ctx, `item ${it.n}: full answer "${full}" has ${words} words (3-6 required)`, at('fullAnswers', j));
        if (!hasPhrase(full, key)) fail(ctx, `item ${it.n}: full answer "${full}" must contain the key word ${it.keyWord} unchanged`, at('fullAnswers', j));
        it.parts.forEach((p, k) => {
          if (!p.accepted.some((a) => hasPhrase(full, a)))
            fail(ctx, `item ${it.n}: full answer "${full}" contains no accepted variant of part ${k + 1}`, at('fullAnswers', j));
        });
      });
    });
  });

// ---- Part 7 (gapped text) -------------------------------------------------
const letter7 = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
const p7q = z.strictObject({ n: z.number().int(), answer: letter7, type: z.enum(RUE_TAGS[7]), explanation });
export const rue7Schema = z
  .strictObject({
    ...rueBase,
    part: z.literal(7),
    text: str,
    paragraphs: z.array(z.strictObject({ id: letter7, text: str })).length(7),
    questions: z.array(p7q).length(6),
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkGaps(ctx, v.text, v.questions.map((q) => q.n), 6);
    if (v.paragraphs.map((p) => p.id).join('') !== 'ABCDEFG')
      fail(ctx, 'paragraph ids must be A-G in order', ['paragraphs']);
    if (new Set(v.questions.map((q) => q.answer)).size !== 6)
      fail(ctx, 'answers must be 6 different paragraphs (exactly 1 paragraph unused)', ['questions']);
  });

// ---- Parts 5, 6, 8 (reading comprehension) ---------------------------------
function checkNumbers(ctx: Ctx, ns: number[], count: number) {
  if (ns.some((n, i) => n !== i + 1)) fail(ctx, `question numbers must be 1..${count} in order, found: ${ns.join(',')}`, ['questions']);
}

const p5q = z.strictObject({
  n: z.number().int(),
  stem: str,
  options: z.strictObject({ A: str, B: str, C: str, D: str }),
  answer: letter4,
  type: z.enum(RUE_TAGS[5]),
  explanation,
});
export const rue5Schema = z
  .strictObject({ ...rueBase, part: z.literal(5), text: str, questions: z.array(p5q).length(6) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkNumbers(ctx, v.questions.map((q) => q.n), 6);
    v.questions.forEach((q, i) => {
      if (new Set(Object.values(q.options).map(norm)).size !== 4)
        fail(ctx, `question ${q.n}: the 4 options must be distinct`, ['questions', i, 'options']);
    });
  });

const p6q = z.strictObject({ n: z.number().int(), stem: str, answer: letter4, type: z.enum(RUE_TAGS[6]), explanation });
export const rue6Schema = z
  .strictObject({
    ...rueBase,
    part: z.literal(6),
    texts: z.array(z.strictObject({ id: letter4, heading: str, text: str })).length(4),
    questions: z.array(p6q).length(4),
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkNumbers(ctx, v.questions.map((q) => q.n), 4);
    if (v.texts.map((t) => t.id).join('') !== 'ABCD') fail(ctx, 'text ids must be A-D in order', ['texts']);
  });

const letter8 = z.enum(['A', 'B', 'C', 'D', 'E', 'F']);
const p8q = z.strictObject({ n: z.number().int(), stem: str, answer: letter8, type: z.enum(RUE_TAGS[8]), explanation });
export const rue8Schema = z
  .strictObject({
    ...rueBase,
    part: z.literal(8),
    sections: z.array(z.strictObject({ id: letter8, heading: str, text: str })).min(4).max(6),
    questions: z.array(p8q).length(10),
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkNumbers(ctx, v.questions.map((q) => q.n), 10);
    const ids = v.sections.map((x) => x.id);
    if (ids.join('') !== 'ABCDEF'.slice(0, ids.length)) fail(ctx, 'section ids must be A, B, C... in order without gaps', ['sections']);
    v.questions.forEach((q, i) => {
      if (!ids.includes(q.answer)) fail(ctx, `question ${q.n}: answer ${q.answer} is not an existing section (${ids.join(',')})`, ['questions', i, 'answer']);
    });
  });

// ---- lookup ---------------------------------------------------------------
export const schemas = {
  'rue/1': rue1Schema,
  'rue/2': rue2Schema,
  'rue/3': rue3Schema,
  'rue/4': rue4Schema,
  'rue/5': rue5Schema,
  'rue/6': rue6Schema,
  'rue/7': rue7Schema,
  'rue/8': rue8Schema,
} as const;
export type SchemaKey = keyof typeof schemas;

/** Schema for a raw JSON object, chosen by paper + part; undefined if this part has no schema yet. */
export function schemaFor(raw: unknown): (typeof schemas)[SchemaKey] | undefined {
  const r = raw as { paper?: unknown; part?: unknown } | null;
  return (schemas as Record<string, (typeof schemas)[SchemaKey]>)[`${r?.paper}/${r?.part}`];
}
