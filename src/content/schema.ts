import { z } from 'zod';
import { LISTENING_TAGS, RUE_TAGS } from './tags';

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

// ---- Listening (ARCHITECTURE 5.4) -------------------------------------------
const lisBase = { ...common, paper: z.literal('listening') };
// TTS plays segment by segment, so segments stay short. "<" and ">" are also rejected globally.
const segment = z.strictObject({
  speaker: z.enum(['A', 'B', 'N']),
  text: str.max(300, 'segment text is over 300 characters; split it into shorter sentences').regex(/^[^<>]*$/, 'segment text must not contain "<" or ">"'),
});
const segments = z.array(segment).min(1);
const letter3 = z.enum(['A', 'B', 'C']);
const distinct = (ctx: Ctx, o: Record<string, string>, n: number, path: (string | number)[]) => {
  if (new Set(Object.values(o).map(norm)).size !== Object.values(o).length) fail(ctx, `question ${n}: the ${Object.keys(o).length} options must be distinct`, path);
};

const l1q = z.strictObject({
  n: z.number().int(),
  stem: str,
  options: z.strictObject({ A: str, B: str, C: str }),
  answer: letter3,
  type: z.enum(LISTENING_TAGS[1]),
  explanation,
});
export const lis1Schema = z
  .strictObject({
    ...lisBase,
    part: z.literal(1),
    extracts: z.array(z.strictObject({ intro: str, segments, questions: z.array(l1q).length(2) })).length(3),
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    const qs = v.extracts.flatMap((e) => e.questions);
    if (qs.some((q, i) => q.n !== i + 1)) fail(ctx, `question numbers must be 1..6 in order across the extracts, found: ${qs.map((q) => q.n).join(',')}`, ['extracts']);
    v.extracts.forEach((e, i) => e.questions.forEach((q, j) => distinct(ctx, q.options, q.n, ['extracts', i, 'questions', j, 'options'])));
  });

const l2q = z.strictObject({
  n: z.number().int(),
  before: z.string(),
  after: z.string(),
  answers: z.array(str).min(1),
  type: z.enum(LISTENING_TAGS[2]),
  explanation,
});
export const lis2Schema = z
  .strictObject({ ...lisBase, part: z.literal(2), segments, questions: z.array(l2q).length(8) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkNumbers(ctx, v.questions.map((q) => q.n), 8);
    v.questions.forEach((q, i) =>
      q.answers.forEach((a, j) => {
        const w = kwtWordCount(a);
        if (w > 3) fail(ctx, `question ${q.n}: answer "${a}" has ${w} words (1-3 required)`, ['questions', i, 'answers', j]);
      }),
    );
  });

const l3q = z.strictObject({
  n: z.number().int(),
  stem: str,
  options: z.strictObject({ A: str, B: str, C: str, D: str }),
  answer: letter4,
  type: z.enum(LISTENING_TAGS[3]),
  explanation,
});
export const lis3Schema = z
  .strictObject({ ...lisBase, part: z.literal(3), segments, questions: z.array(l3q).length(6) })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    checkNumbers(ctx, v.questions.map((q) => q.n), 6);
    v.questions.forEach((q, i) => distinct(ctx, q.options, q.n, ['questions', i, 'options']));
  });

const letter8L = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
const l4task = z.strictObject({
  prompt: str,
  type: z.enum(LISTENING_TAGS[4]),
  options: z.strictObject({ A: str, B: str, C: str, D: str, E: str, F: str, G: str, H: str }),
});
const five = <T extends z.ZodType>(t: T) => z.array(t).length(5);
export const lis4Schema = z
  .strictObject({
    ...lisBase,
    part: z.literal(4),
    speakers: five(z.strictObject({ segments })),
    task1: l4task,
    task2: l4task,
    answers1: five(letter8L),
    answers2: five(letter8L),
    explanations1: five(explanation),
    explanations2: five(explanation),
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    for (const k of ['1', '2'] as const) {
      const a = v[`answers${k}`];
      if (new Set(a).size !== a.length) fail(ctx, `task${k}: the 5 answers must be 5 different options, found: ${a.join('')}`, [`answers${k}`]);
      distinct(ctx, v[`task${k}`].options, Number(k), [`task${k}`, 'options']);
    }
  });

// ---- Writing (ARCHITECTURE 5.4) -----------------------------------------------
const noAngle = str.regex(/^[^<>]*$/, 'must not contain "<" or ">"');
export const WRITING_TASK_TYPES = ['essay', 'letter', 'email', 'proposal', 'report', 'review'] as const;
export const writingSchema = z
  .strictObject({
    ...common,
    paper: z.literal('writing'),
    part: z.union([z.literal(1), z.literal(2)]),
    taskType: z.enum(WRITING_TASK_TYPES),
    instructions: noAngle,
    inputText: noAngle,
    points: z.array(noAngle),
    wordMin: z.number().int().positive(),
    wordMax: z.number().int().positive(),
    modelPlanCs: noAngle,
  })
  .superRefine((v, ctx) => {
    checkSource(ctx, v);
    if (v.part === 1 && v.taskType !== 'essay') fail(ctx, 'Part 1 must be an essay', ['taskType']);
    if (v.part === 2 && v.taskType === 'essay') fail(ctx, 'Part 2 must not be an essay', ['taskType']);
    if (v.part === 1 && (v.points.length < 2 || v.points.length > 3)) fail(ctx, 'Part 1 needs 2-3 points', ['points']);
    if (v.part === 2 && v.points.length) fail(ctx, 'Part 2 has no points', ['points']);
    if (v.wordMin > v.wordMax) fail(ctx, 'wordMin must not exceed wordMax', ['wordMin']);
  });

// ---- Speaking (ARCHITECTURE 5.4): one set = all four parts, no `part` field ----
const strs = (min: number, max: number) => z.array(noAngle).min(min).max(max);
export const speakingSchema = z
  .strictObject({
    ...common,
    paper: z.literal('speaking'),
    part1: z.strictObject({ questions: strs(6, 8) }),
    part2: z.strictObject({ instructions: noAngle, situations: strs(3, 3), question: noAngle, partnerQuestion: noAngle }),
    part3: z.strictObject({ question: noAngle, options: strs(5, 5), decisionQuestion: noAngle }),
    part4: z.strictObject({ questions: strs(5, 6) }),
    tipsCs: noAngle,
  })
  .superRefine((v, ctx) => checkSource(ctx, v));

// ---- Reference: official format facts used by prompts (ARCHITECTURE 5.4) ----
const criterion = z.strictObject({ name: str, descriptionEn: str, descriptionCs: str });
export const referenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: common.id,
  paper: z.literal('reference'),
  label: z.literal('official-format-reference'),
  source: z.strictObject({ url: z.url(), readOn: z.iso.date() }),
  sources: z.array(z.strictObject({ url: z.url(), readOn: z.iso.date(), what: str })),
  writingCriteria: z.array(criterion).length(4),
  speakingCriteria: z.array(criterion).min(5),
  timings: z.object({ writingMinutes: z.number(), speakingMinutes: z.number() }).catchall(z.number()),
  notice: explanation,
  notes: z.array(str),
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
  'listening/1': lis1Schema,
  'listening/2': lis2Schema,
  'listening/3': lis3Schema,
  'listening/4': lis4Schema,
  'writing/1': writingSchema,
  'writing/2': writingSchema,
  'speaking/undefined': speakingSchema,
  'reference/undefined': referenceSchema,
} as const;
export type SchemaKey = keyof typeof schemas;

/** Schema for a raw JSON object, chosen by paper + part; undefined if this part has no schema yet. */
export function schemaFor(raw: unknown): (typeof schemas)[SchemaKey] | undefined {
  const r = raw as { paper?: unknown; part?: unknown } | null;
  return (schemas as Record<string, (typeof schemas)[SchemaKey]>)[`${r?.paper}/${r?.part}`];
}
