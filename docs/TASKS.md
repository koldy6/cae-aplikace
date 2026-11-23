# CAE English – Tasks (MVP)

Status: APPROVED 2026-11-23 together with ARCHITECTURE.md.
Each task should take half a day or less, sits on its own feature branch, and is done only when `npm run check` is green (from T01 on).
Agents: **dev** = developer, **ui** = ui-designer, **qa** = qa-engineer, **edu** = education-specialist.
Content tasks (edu) run alongside dev tasks. Content becomes usable once it passes `content.test.ts` (available from T04).

Milestones:
- **M1 (end of week 1, P1 usable):** drills, review, progress, weak areas and retry for R&UoE Parts 1-4 and 7, with the first content batch.
- **M2 (start of week 2, P1 complete):** Parts 5, 6 and 8 plus content at the SPEC minimum.
- **M3 (end of week 2, P2):** backup, Listening, Writing, Speaking, mini mock.

## Week 1 – P1 core

### T01 Project scaffold (dev) — ✅ DONE 2026-11-23 (zod 4.6.7, vite 8.3.8, vitest 5.1.1, typescript 6.0.3)
Depends on: owner approval of ARCHITECTURE.md and of the npm install (4 packages, section 2).
- Create `package.json`, `tsconfig.json` (strict, noEmit, moduleResolution bundler), `vite.config.ts` (including the build-only CSP plugin), `index.html` (`lang`, viewport, CSP placeholder), `.gitignore`, and an empty `src/main.ts`.
- Add the scripts `dev`, `build`, `preview`, `test`, `check`.
- AC: `npm run dev`, `npm run build`, `npm run preview` and `npm test` all run from `C:\claude ai workspace\firma-na-aplikace\projects\cae-english` (path with spaces). A placeholder test passes. The built `index.html` contains the CSP meta tag. The lockfile is committed and `node_modules`/`dist` are ignored.

### T02 Question-type tags and content guide (edu) — ✅ DONE 2026-11-23 (A7 kept as app convention, see CONTENT_GUIDE.md)
Depends on: none (can run in parallel with T01).
- Write `docs/CONTENT_GUIDE.md`: the tag list per part (for example Part 1 `collocation`, `fixed-phrase`, `phrasal-verb`, `linking`, `meaning-in-context`, `dependent-preposition`), the explanation style (EN + CZ, 1-3 sentences), the rules for distractors, how to split KWT items into 2 marked parts, the allowed wording for labels, and the forbidden wording.
- Confirm or reject assumption A7 (KWT over 6 words = 0, contractions count 2).
- AC: tags exist for every part (R&UoE 1-8, Listening 1-4). Each tag has a one-line definition. A7 decision is recorded. Every factual claim about the format cites a SPEC section.

### T03 Content schema, R&UoE Parts 1-4 and 7 (dev) — ✅ DONE 2026-11-23
- Note from T02: in the KWT example (ARCHITECTURE §5.3) do not make the bare key word a marked part; split e.g. `["unless you"]` / `["promise"]`.
Depends on: T01, T02.
- Write `src/content/schema.ts` (common fields plus Parts 1, 2, 3, 4 and 7), `tags.ts` and `types.ts` (z.infer).
- AC: Zod schemas match ARCHITECTURE section 5.3, including the cross-field rules. Types are exported. There is one hand-written valid sample file per part in `src/content/data/`.

### T04 Content validation test and loader (dev) — ✅ DONE 2026-11-23
- Note from T02: forbidden words ("official", "authentic", "past paper") are checked only in `title`, `topic` and label fields, not in passage text.
Depends on: T03.
- Write `tests/content.test.ts` (global checks: unique ids, file name = id, tags, no `<`/`>`, forbidden wording) and `src/content/loader.ts` (`import.meta.glob`, index by paper/part).
- AC: each sample file passes. A test fixture with one deliberately broken file per rule (wrong option count, 7 gaps, KWT without the key word, a 2-word Part 2 answer, a duplicate id, an `<b>` tag, "real exam" wording) fails with a readable message that names the file. The loader returns sets grouped by part.

### T05 Content batch 1a: R&UoE Parts 1 and 2 (edu) — ✅ DONE 2026-11-23 (6 sets, 48 questions)
Depends on: T02 (format), T04 (to validate; can start drafting earlier).
- AC: 3 Part 1 texts and 3 Part 2 texts, `label: ai-generated`, EN + CZ explanations, tags from T02. All pass `npm test`. The specialist self-reviews 100% of keys, and `reviewed: true` is set.

### T06 Content batch 1b: R&UoE Parts 3, 4 and 7 (edu) — ✅ DONE 2026-11-23 (8 sets: 24 + 18 KWT + 12 questions)
Depends on: T02, T04.
- AC: 3 Part 3 texts, 3 Part 4 sets (18 items, each with 2 marked parts and at least 1 alternative where natural), 2 Part 7 texts (6 gaps + 1 extra paragraph). All pass `npm test` and are reviewed.

### T07 Scoring module (dev) — ✅ DONE 2026-11-23
- Note from T06: KWT items with several variants per part — score the item against `fullAnswers` combinations, not each part independently, so unrelated variant combinations do not get 2 marks.
Depends on: T03.
- Write `src/domain/scoring.ts` with `normalise`, letter scoring, open answer scoring, `kwtScore` and per-part marks (1/0-2/2).
- AC: `tests/scoring.test.ts` covers all cases in ARCHITECTURE section 10, including KWT 0/1/2, key word missing or changed, over 6 words, contractions and alternatives. Functions are pure (no DOM, no storage).

### T08 Storage layer (dev) — ✅ DONE 2026-11-23 (corrupt data kept under `cae-english:v1:corrupt`)
Depends on: T01.
- Write `store.ts`, `localAdapter.ts` and `memoryAdapter.ts`. Data model as in section 6. Defaults on empty or corrupt data. Quota and private-mode errors switch to in-memory mode with a flag. Debounced save. `storage.persist()` on start.
- AC: `tests/store.test.ts` green (round-trip, corrupt JSON -> defaults with no throw, quota error -> flag set). The API is typed with no `any`.

### T09 Visual design tokens and screen sketches (ui) — ✅ DONE 2026-11-23 (class names in main.css header)
Depends on: none (can run in parallel with T03-T08).
- Produce `src/styles/main.css`: colour tokens at AA contrast, type scale, spacing, focus ring, buttons, badges (two label types), correct/incorrect styles with icon and text, mobile-first layout plus a 900 px breakpoint, `prefers-reduced-motion`. Add short text sketches of the home, drill, review and weak-area screens in `docs/CONTENT_GUIDE.md` or as comments in the CSS (no extra report file).
- AC: contrast ratios are listed next to the tokens (all 4.5:1 or above). No external fonts or CDNs. Touch targets are 44 px or larger.

### T10 UI shell: h(), router, layout, label/notice (dev) — ✅ DONE 2026-11-23
Depends on: T01, T09.
- Write `ui/h.ts` (textContent only), the hash router with focus on `<h1>` after navigation, the layout (header, nav, main, footer notice "Not official Cambridge material"), the `labelBadge` component, and `tests/noHtmlSinks.test.ts`.
- AC: navigating between 3 stub screens works with the keyboard and the browser back button. The guard test fails if `innerHTML` is added anywhere in `src/`. The footer notice appears on every screen (F5/US4).

### T11 Home, part picker and set list (dev) — ✅ DONE 2026-11-23
Depends on: T04, T08, T10.
- AC: the home screen shows tiles for R&UoE Parts 1-8 (parts with no content are marked "připravujeme"). Tap a part, then choose a set (with label badge and last score), then the drill. That is 2 taps or fewer (US1). Days to the exam are shown once the exam date is set (a small settings field with the date).

### T12 Drill screen for R&UoE Parts 1-3 (dev) — ✅ DONE 2026-11-23 (checked at 360 px)
Depends on: T07, T11, T05 (or sample files).
- Render the gap text (parse `\n\n` and `[[n]]`). Part 1 uses a `<select>` A-D per gap. Parts 2 and 3 use an `<input>` with the stem word shown for Part 3. Submit scores the drill and saves the session and attempts.
- AC: a score "x/y" is shown and announced via `aria-live`. Attempts are stored with part and type. Every gap has an accessible label. The drill works at 360 px width.

### T13 Review screen with self-mark and report issue (dev) — ✅ DONE 2026-11-23
Depends on: T12.
- For each question show my answer, the correct answer or accepted answers, the EN and CZ explanations (`lang` attributes), the tag and the label. Add "Myslím, že je to správně" for open answers (sets `selfMarked`) and "Nahlásit chybu" (stores an issue note).
- AC: US2 criteria are met. The state is shown with text and icon (not colour only). Self-marking updates the stored score. The report-issue note is saved in `issues`.

### T14 Drill: Part 4 KWT and Part 7 gapped text (dev) — ✅ DONE 2026-11-23
Depends on: T12, T13, T06.
- Part 4: sentence 1, the key word in bold via a CSS class, and an input between `before` and `after`, with a live word count hint (3-6). Part 7: a `<select>` per gap listing A-G, the paragraphs shown below, and duplicates allowed in input but flagged.
- AC: KWT review shows marks 0/1/2 and the `fullAnswers`. Part 7 is scored 2 marks per gap. Both parts are fully operable with the keyboard.

### T15 Weak-area module (dev) — ✅ DONE 2026-11-23
Depends on: T07, T08.
- Write `domain/weakAreas.ts`: accuracy per (paper, part, type), eligible when n >= 10, weakest 3, error log = latest attempt wrong, and 7-day activity.
- AC: `tests/weakAreas.test.ts` is green for all cases in section 10, including partial KWT marks.

### T16 Progress, weak-area and retry screens (dev) — ✅ DONE 2026-11-23
Depends on: T13, T15.
- The progress screen lists sessions and per-part accuracy. The weak-area screen shows a table plus the highlighted weakest 3 ("Part 3 word formation: 55%"), with a "too few answers" note below 10. The retry drill uses only questions from the error log (set-based parts show the other gaps read-only).
- AC: US3 criteria are met. When a retried question is answered correctly, it leaves the error log.

### T17 QA milestone M1 (qa) — ✅ DONE 2026-11-23 (0 blockers, 5 major + 7 minor fixed, see QA_M1.md)
Depends on: T05, T06, T14, T16.
- Run `npm run check` and the manual smoke checklist (ARCHITECTURE section 10) for P1 scope on Chrome or Edge desktop and on a phone via `vite --host`. Do a keyboard-only pass and spot-check contrast.
- AC: a defect list is filed as tasks (blockers fixed before M1 sign-off). The owner gets a short Czech status: what works and how to start the app.

## Start of week 2 – P1 completion

### T18 Schema plus drill screens for Parts 5, 6 and 8 (dev) — ✅ DONE 2026-11-23
Depends on: T14.
- Add the schemas from section 5.3 and the drill screens: Part 5 MC on a long text with a two-column layout at 900 px or wider; Part 6 four texts plus `<select>` A-D per question; Part 8 sections plus `<select>` per question.
- AC: the schema tests include valid and broken fixtures for each part. The marks are 2/2/1. The review screen is reused.

### T19 Content batch 2: R&UoE Parts 5, 6 and 8 (edu) — ✅ DONE 2026-11-23 (3+2+2 sets)
Depends on: T02, T18 (schema).
- AC: 3 Part 5 texts, 2 Part 6 sets and 2 Part 8 sets. All pass the tests and are reviewed (distractors plausible but clearly wrong, with the reason stated in the explanation).

### T20 Content batch 3: top up Parts 1-4 and 7 to SPEC minimum (edu) — ✅ DONE 2026-11-23 (all SPEC minimums met: 34 sets, 244 questions)
Depends on: T05, T06, the M1 feedback.
- AC: Parts 1-3 have 6 texts each, Part 4 has 36 items and Part 7 has 3 texts. A sample review of 20% is done by edu with fresh eyes, and issues from the `issues` reports are fixed.

## Week 2 – P2

### T21 Backup export/import (F11) (dev) — ✅ DONE 2026-11-23
Depends on: T08. Can be pulled into week 1 if time allows (data-loss risk).
- Write `storage/backup.ts` with BackupSchema, export download, import (size limit, parse, validate, preview, confirm, replace) and a backup reminder banner.
- AC: `tests/backup.test.ts` is green (round-trip, invalid inputs leave data unchanged). The UI states that recordings are not included. US9 is met.

### T22 TTS player module (dev) — ✅ DONE 2026-11-23
Depends on: T01.
- Write `media/tts.ts`: feature detection, async voice loading, en-GB preference, voices A/B, per-segment playback, pause/resume/stop, rate, a play counter with limit 2 or unlimited, and a `?nospeech` override for testing the fallback.
- AC: works in Chrome and Edge on Windows (manual). The fallback message plus script appears when unsupported. Settings store the voice and rate. No uncaught errors when there are no voices.

### T23 Listening schema plus content batch 4 (Parts 1 and 2) (dev schema, edu content) — ✅ DONE 2026-11-23
- Note from T02: Listening Part 4 schema needs `task1.type` and `task2.type` tag fields.
Depends on: T02, T04.
- Dev adds the Listening 1-4 schemas and fixtures (section 5.4). Edu writes 2 sets of Listening Part 1 and 2 sets of Part 2 (scripts written for TTS: short sentences, labelled speakers).
- AC: the schema rules are enforced (3 options in Part 1, 4 in Part 3, 2x8 in Part 4, 1-3 words in Part 2). The content passes the tests.

### T24 Listening drill screens, Parts 1-4 (dev) — ✅ DONE 2026-11-23
Depends on: T22, T23, T13.
- Each part has a player bar and its questions. Part 4 uses two `<select>` columns per speaker. The script can be revealed after submitting. Results are saved as a `listening` session.
- AC: US5 is met. Scoring and review are reused. The play limit is enforced when set.

### T25 Content batch 5: Listening Parts 3 and 4 (edu) — ✅ DONE 2026-11-23
Depends on: T23.
- AC: 2 sets of Part 3 and 2 sets of Part 4 that pass the tests. Total Listening content is about 60 questions.

### T26 Writing tasks content (edu)
Depends on: T02.
- AC: 8 tasks (4 Part 1 essays, plus Part 2 letter/email, proposal, report and review), labelled `ai-generated`. `reference/format.json` contains the Writing and Speaking criteria names, the timings and the notice text, with source URL and date (`official-format-reference`).

### T27 Writing helper plus prompt builder (dev)
Depends on: T26, T10, T08.
- Write `domain/prompts.ts` (`buildWritingPrompt`) and the writing screen: word count with a warning outside 220-260, optional timer, draft autosave, copy with clipboard fallback, and a paste-feedback textarea (stored and shown as plain text).
- AC: `tests/prompts.test.ts` is green. US6 is met on desktop. The fallback copy works on the phone over http.

### T28 Speaking content (edu)
Depends on: T02.
- AC: 5 sets covering Parts 1-4. Part 2 uses text situation descriptions (A9). The content passes the schema test (dev adds the Speaking schema in T29 if it is not done yet).

### T29 Recorder module plus IndexedDB recordings (dev)
Depends on: T08.
- Write `media/recorder.ts` (feature detection, mime choice, error mapping) and `storage/recordings.ts` (put/get/delete).
- AC: manual test on Chrome or Edge: record, stop, reload, play back. Denied and missing mic each show their Czech message with no crash (US7).

### T30 Speaking screen plus speaking prompt (dev)
Depends on: T28, T29, T27.
- Show the prompt per part with a timer (part timings from `format.json`), record and play back, a download button per recording, a transcript field, and `buildSpeakingPrompt` with copy.
- AC: US7 is met. `prompts.test.ts` is extended to cover the 6 speaking criteria and the disclaimer.

### T31 Mini mock (dev)
Depends on: T18, T24.
- Write `domain/mock.ts` (set selection, time budget, aggregation) and the mock screen: a countdown that auto-submits, a per-part breakdown, and a saved `mock` session.
- AC: `tests/mock.test.ts` is green. US8 is met. Only raw scores are shown (no scale or grade).

### T32 QA milestone M3 (qa)
Depends on: T21, T24, T27, T30, T31.
- Run the full smoke checklist (including mic denied, no voices, CSP in `npm run preview`, export/import between PC and phone) plus `npm run check`.
- AC: the defect list is resolved or accepted by the owner. The owner gets a short Czech user guide covering how to start the app, back up data and use claude.ai prompts.

## Cut order if time runs short
T31 mock -> T30/T29 speaking -> T25 Listening 3-4 content -> T24 Part 4 listening screen. P1 (T01-T20) and T21 backup are not cut.
