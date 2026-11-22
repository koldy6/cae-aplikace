# CAE English – Architecture (MVP)

Status: DRAFT, waiting for owner approval. No development starts until it is approved.
Input: `docs/SPEC.md` (APPROVED 2026-11-22), `projects/cae-english/CLAUDE.md`, root `CLAUDE.md`.
Author: architect agent, 2026-11-22.

## 1. Summary
A static single-page web app written in **plain TypeScript with no UI framework**, built and served by **Vite**, tested with **Vitest**, with **Zod** for content and backup validation. Everything runs in the browser on this PC. There is no backend, no account and no network call apart from loading the app itself. Content ships as JSON files inside the repo. Progress is kept in `localStorage`, and Speaking recordings are kept in IndexedDB. The app never calls an AI service. For Writing and Speaking it builds a text prompt that the owner copies into claude.ai.

## 2. Stack and reasons

| Piece | Choice | Version (verified via Context7, 2026-11-22) | Why |
|---|---|---|---|
| Language | TypeScript, `strict` | `typescript` 6.0.x (Context7 lists 6.0.2 and 7.0.2) | Types catch content and scoring mistakes early. We only use `tsc --noEmit` as a type check, and Vite strips the types. We pick 6.0.x, the mature JS-based compiler. 7.0 (native) would also work, because we only use the `tsc` CLI. |
| Dev server / build | Vite | `vite` 8.3.x (docs v8.3.5; needs Node 20.19+ / 22.12+; Node 26 OK) | No-config TS, JSON imports, `import.meta.glob` for content files, fast dev server. It is one tool instead of a hand-made build. |
| Tests | Vitest | `vitest` 5.0.x (docs v5.0.3; needs Vite >= 6.4 and Node >= 22.12) | Shares the Vite config, runs TS directly, and is Jest-compatible. Tests run in `environment: 'node'` because all tested logic is pure. |
| Validation | Zod | `zod` 4.6.x (docs v4.6.7) | Runtime dependency, used for two jobs: (1) content schema checks in tests, (2) validating an imported backup file before it overwrites data. `z.infer` gives the TS types from the same schema, so types and checks cannot drift. Cross-field rules use `.superRefine()`, and readable errors come from `z.prettifyError()`. |
| UI | Vanilla DOM + ~40-line `h()` helper | none | See section 3. |
| Routing | Hash router (`#/drill/rue1-001`) | none | About 30 lines. Works on any static server, and no server rewrites are needed. |
| Styling | One plain CSS file with CSS custom properties | none | Responsive with flex/grid and media queries. No CSS framework is needed for about 12 screens. |
| TTS | Web Speech API `speechSynthesis` | browser | Free and built in (SPEC F7). |
| Recording | `getUserMedia` + `MediaRecorder` | browser | Free and built in (SPEC F9). |
| Storage | `localStorage` (JSON) + IndexedDB (raw API, recordings only) | browser | Progress data is small. Audio blobs are too big for localStorage. |

**Total: 4 npm packages (1 runtime: zod; 3 dev: vite, vitest, typescript).** No paid services. Exact versions are pinned by `npm install` into `package-lock.json`, which is committed.

Install command for task T01 (needs the owner's OK under the root CLAUDE.md rule "ask before installing"):
`npm install zod@^4.6` and `npm install -D vite@^8.3 vitest@^5.0 typescript@~6.0`

## 3. Why no framework (decision)
- The app has about 12 screens, each a simple form or list. State is local to the screen (current answers) plus a persisted store. There is no shared reactive state worth a framework.
- The logic worth testing (scoring, weak areas, storage, backup, prompt building, content validation) is plain functions with no DOM. It is tested in Node with no DOM library.
- Safety by construction: the `h()` helper only creates elements and sets text with `textContent`/`createTextNode`. There is no HTML string path at all (see section 9).
- Fewer dependencies and nothing to learn or upgrade before the exam.
- Accepted cost: re-rendering is manual (each screen has a `render()` that rebuilds its root). That is fine at this size.
- Fallback if this hurts: Preact (about 4 kB) can be added later screen by screen. That is not expected before the exam.

Rejected alternatives:
- **React/Vue/Svelte/Preact**: more dependencies plus a JSX/compiler setup. The gain is small for this size.
- **No-build vanilla ES modules (.js)**: possible, but we would lose TS types and JSON imports, and serving would still need a local HTTP server (modules and `getUserMedia` do not work from `file://`). Vite costs one dev dependency and removes these problems.
- **Playwright E2E**: it downloads about 300+ MB of browsers and slows CI. For a one-user MVP, a written manual smoke checklist (section 10) is cheaper. We can revisit after the exam.
- **jsdom/happy-dom + DOM tests**: not needed because UI logic is kept thin. Rejected for now.
- **ESLint/Prettier**: no strong need for one developer. `tsc --strict` plus a grep-style guard test (section 9) covers the risky rule.
- **`idb` / `localforage` / `fake-indexeddb`**: IndexedDB is used for one store with 3 operations. A raw wrapper of about 50 lines is enough and is tested manually.
- **Hosting (GitHub Pages, Netlify)**: not in MVP. Local run only (SPEC default). See section 11 for the phone caveat.

## 4. Folder structure
The app lives directly in `projects/cae-english/`. The parent path contains spaces (`C:\claude ai workspace\...`). All npm scripts call tools by name (`vite`, `vitest`, `tsc`) with no shell paths, and no path in config is absolute. Vite and npm handle spaces in parent folders. T01 includes a check that `dev`, `build`, `test` and `preview` all run from this path.

```
projects/cae-english/
  package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, .gitignore
  docs/            SPEC.md, ARCHITECTURE.md, TASKS.md, CONTENT_GUIDE.md (T02)
  public/          favicon only
  src/
    main.ts                 boot: load content, init store, start router
    ui/h.ts                 element helper (textContent only)
    ui/router.ts            hash router
    ui/components/          labelBadge, notice, scoreBar, timer, reviewItem, gapText, optionGroup
    screens/                home, partPicker, drill, review, progress, weakAreas, retry,
                            listening, writing, speaking, mock, settings
    domain/
      types.ts              re-exported z.infer types
      scoring.ts            per-part scorers, normalise(), kwtScore()
      weakAreas.ts          accuracy per part/type, weakest 3
      prompts.ts            buildWritingPrompt(), buildSpeakingPrompt()
      mock.ts               pick sets, time budget, aggregate
    content/
      schema.ts             Zod schemas (per part) + cross-field checks
      tags.ts               controlled vocabulary of question types per part
      loader.ts             import.meta.glob('./data/**/*.json', { eager: true }) -> validated index
      data/
        rue/part1/rue1-001.json ...      one item set per file
        rue/part2 ... rue/part8
        listening/part1 ... part4
        writing/w-001.json ...
        speaking/s-001.json ...
        reference/format.json            official-format-reference: criteria names, timings, sources
    storage/
      store.ts              typed repository over a StorageLike adapter (get/set/remove)
      localAdapter.ts       window.localStorage adapter; memoryAdapter.ts for tests
      backup.ts             export/import + BackupSchema (Zod) + migrations
      recordings.ts         IndexedDB wrapper (put/get/delete Blob)
    media/
      tts.ts                speechSynthesis player (segments, voices, rate, play limit)
      recorder.ts           MediaRecorder wrapper with feature detection and error mapping
    styles/main.css
  tests/
    scoring.test.ts, weakAreas.test.ts, store.test.ts, backup.test.ts,
    prompts.test.ts, content.test.ts, noHtmlSinks.test.ts, mock.test.ts
```

npm scripts: `dev` (vite), `build` (tsc --noEmit && vite build), `preview` (vite preview), `test` (vitest run), `check` (tsc --noEmit && vitest run). `check` must pass before every commit and merge.

## 5. Content model
### 5.1 Principles
- One JSON file = one item set (one cloze text, one KWT set of 6, one listening set, one writing task, one speaking set). This gives small diffs and lets content be reviewed and generated in batches.
- The ID is unique across all content and matches the file name: `rue1-001`, `rue4-003`, `lis2-001`, `w-001`, `s-001`. Question IDs are `<setId>#<n>`.
- Content is plain text only. No HTML. Minimal inline markup is parsed by our own code into DOM nodes:
  - paragraph break = blank line (`\n\n`)
  - gap marker = `[[n]]` (n = question number; `[[0]]` = example gap, optional)
  - nothing else (no bold or links). The KWT key word is a separate field.
- Every set carries `label` and `meta`. `official-format-reference` requires `source.url` and `source.readOn`.
- Explanations are `{ "en": string, "cs": string }` and both are required for every auto-scored question (assumption A6).
- `type` is a question-type tag from the controlled list in `tags.ts`. Weak-area stats group by (part, type), so free-text tags are rejected.

### 5.2 Common fields (all sets)
```json
{
  "schemaVersion": 1,
  "id": "rue1-001",
  "paper": "rue",            // rue | listening | writing | speaking
  "part": 1,
  "label": "ai-generated",   // ai-generated | official-format-reference
  "source": null,            // { "url": "...", "readOn": "2026-11-22" } required when label = official-format-reference
  "title": "Urban beekeeping",
  "topic": "environment",
  "difficulty": 2,           // optional 1-3
  "reviewed": false          // true after education-specialist sample review
}
```

### 5.3 Per-part payload (R&UoE)
| Part | Payload | Cross-field rules (enforced in `content.test.ts`) |
|---|---|---|
| 1 MC cloze | `text` with `[[1]]..[[8]]`; `questions[8]`: `{ n, options:{A,B,C,D}, answer:"A".."D", type, explanation }` | exactly 8 gaps, numbered 1-8 and matching questions; 4 distinct options |
| 2 Open cloze | `text` with 8 gaps; `questions[8]`: `{ n, answers:[string], type, explanation }` | every accepted answer is one word (no spaces); 8 gaps |
| 3 Word formation | `text` with 8 gaps; `questions[8]`: `{ n, stem:"COMPETE", answers:[string], type, explanation }` | stem is uppercase and one word; answers one word; answer differs from stem |
| 4 KWT | `items[6]`: `{ n, sentence1, keyWord:"UNLESS", before, after, parts:[{accepted:[..]},{accepted:[..]}], fullAnswers:[..], type, explanation }` | key word is uppercase; every full answer contains the key word unchanged and has 3-6 words (contractions count as 2, assumption A7); every full answer contains one accepted variant of each part, and both parts are present |
| 5 MC long text | `text`; `questions[6]`: `{ n, stem, options:{A..D}, answer, type, explanation }` | 6 questions, 4 options |
| 6 Cross-text | `texts[4]`: `{ id:"A".."D", heading, text }`; `questions[4]`: `{ n, stem, answer:"A".."D", type, explanation }` | ids A-D unique; answers refer to existing texts |
| 7 Gapped text | `text` with `[[1]]..[[6]]`; `paragraphs[7]`: `{ id:"A".."G", text }`; `questions[6]`: `{ n, answer, type, explanation }` | 6 gaps; answers unique; exactly 1 paragraph unused |
| 8 Multiple matching | `sections[4..6]`: `{ id, heading, text }`; `questions[10]`: `{ n, stem, answer, type, explanation }` | 10 questions; answers refer to existing sections (sections may repeat) |

Marks per question: Parts 1-3 and 8 = 1, Part 4 = 0-2, Parts 5-7 = 2. The mark values live in `scoring.ts`, not in content.

Example (Part 4 item):
```json
{ "n": 1,
  "sentence1": "I will only lend you the car if you promise to drive carefully.",
  "keyWord": "UNLESS",
  "before": "I won't lend you the car",
  "after": "to drive carefully.",
  "parts": [ { "accepted": ["unless"] }, { "accepted": ["you promise"] } ],
  "fullAnswers": ["unless you promise"],
  "type": "conditional",
  "explanation": { "en": "...", "cs": "..." } }
```
(The education-specialist designs the two marked parts per item so that each part maps to one of the official two marking chunks.)

### 5.4 Listening, Writing, Speaking payloads
- Script: `segments[]`: `{ speaker:"A"|"B"|"Narrator"|name, voice:"m"|"f"|null, text }`. TTS plays segment by segment.
- Listening 1: `extracts[3]`: `{ intro, segments, questions[2] {n, stem, options:{A,B,C}, answer, type, explanation} }`. Rules: 3 options, n runs 1-6, dialogue has 2 speakers.
- Listening 2: `segments` (one speaker), `questions[8]`: `{ n, before, after, answers:[1-3 words], type, explanation }`.
- Listening 3: `segments` (dialogue), `questions[6]` with 4 options A-D.
- Listening 4: `speakers[5]`: `{ segments }`; `task1` and `task2`: `{ prompt, options:{A..H} }`; `answers1[5]`, `answers2[5]`; explanations per speaker per task. Rules: 8 options each, answers unique within a task. Answering uses a select per speaker, which mirrors the digital drag-and-drop task in a keyboard-friendly form.
- Writing task: `{ part:1|2, taskType:"essay"|"letter"|"email"|"proposal"|"report"|"review", instructions, inputText, points:[..] (Part 1 notes), wordMin:220, wordMax:260 }`.
- Speaking set: `part1.questions[]`; `part2: { instructions, situations[3] (text descriptions, see A9), question, partnerQuestion }`; `part3: { question, options[5], decisionQuestion }`; `part4.questions[]`.
- `reference/format.json` (`official-format-reference`, with source URLs): Writing criteria names, Speaking criteria names, part timings and the general notice text. Prompts and notices read from this file, so the wording is maintained in one place.

### 5.5 Validation
- `content.test.ts` loads every file under `src/content/data/**` with Node `fs` and runs it through the matching Zod schema (chosen by `paper` + `part`). It then runs the global checks: unique IDs, file name = id, allowed tags, no `<` or `>` characters in any string (keeps content free of HTML), and a forbidden-wording check. The forbidden phrases are "official Cambridge question", "real exam" and "authentic exam" in any `ai-generated` set (SPEC section 7).
- A malformed file fails `npm test`, and so fails `npm run check` and the commit gate. Errors are printed with `z.prettifyError()` plus the file name.
- At runtime the loader trusts the bundled content (it was validated by tests) and only skips sets whose `paper/part` it does not know, so one bad file cannot crash the app.

## 6. Progress data model (localStorage)
One key `cae-english:v1` holds one JSON document. It is read on start and written after each change (debounced). Expected size: under 1 MB for thousands of attempts, well inside the roughly 5 MB limit.

```ts
type AppData = {
  schemaVersion: 1;
  settings: { examDate: string | null; ttsRate: number; ttsVoiceA: string | null;
              ttsVoiceB: string | null; listeningPlayLimit: 2 | null };
  sessions: Session[];   // { id, kind:'drill'|'retry'|'mock'|'listening', setIds, startedAt, finishedAt, marks, maxMarks, perPart }
  attempts: Attempt[];   // { id, sessionId, questionId, setId, paper, part, type, answer, marks, maxMarks, at, selfMarked?:boolean }
  writing: WritingEntry[];   // { id, taskId, text, wordCount, startedAt, savedAt, feedback:string|null, feedbackAt }
  speaking: SpeakingEntry[]; // { id, setId, part, recordingKey|null, durationMs, transcript|null, feedback|null, at }
  issues: IssueReport[];     // { questionId, note, at }  ("report issue", SPEC risk mitigation)
};
```
- Derived, not stored: the error log is the list of questions whose **latest** attempt has `marks < maxMarks`. Weak-area stats and the 7-day activity are computed from `attempts`.
- Weak areas (`weakAreas.ts`): group by (paper, part, type) and compute accuracy = sum(marks) / sum(maxMarks), with n = number of questions. Groups with n >= 10 are eligible, and the 3 lowest are highlighted (ties broken by larger n). All attempts are counted (assumption A8).
- Retry drill: the questions from the error log. For set-based parts (cloze, gapped text) the whole set is shown, with only the previously wrong gaps active and the other gaps filled in read-only.
- Storage failures (`QuotaExceededError`, private mode) are caught. The app shows a banner, "data se neukládají – exportujte zálohu", and keeps working in memory.
- On first run the app calls `navigator.storage.persist()` (best effort) to lower the eviction risk. It also shows the SPEC notice that clearing browser data deletes progress.
- Recordings: IndexedDB database `cae-english`, store `recordings`, key = `recordingKey`, value = Blob. They are never uploaded.

### Backup (F11)
- Export: `{ app:"cae-english", schemaVersion:1, exportedAt, data: AppData }` is saved as `cae-english-backup-YYYY-MM-DD.json` via Blob + `<a download>`. Recordings are **not** included, because the files are too large (stated in the UI). Each recording has its own "download" button.
- Import: file input, then `JSON.parse` in try/catch, then `BackupSchema.safeParse`, then a preview (counts and date), then a confirmation, then **replace** all data. A migration hook (`migrate(fromVersion)`) is ready for later schema versions. Invalid files show a readable error and change nothing.

## 7. Key flows
1. **Drill (F1/F2)**: Home -> part tile -> set list (shows label, done/score) -> drill -> Submit -> `scoring.ts` returns per-question marks -> attempts and the session are saved -> Review screen (my answer, correct answer, accepted alternatives, EN and CZ explanation, type tag, label, "report issue"). That is 2 taps from home to a drill (US1).
2. **Scoring rules** (`scoring.ts`, pure):
   - `normalise(s)`: trim, lowercase, collapse spaces, curly to straight apostrophes, remove a trailing full stop.
   - Parts 1/5/6/7/8 and Listening 1/3/4: letter equality.
   - Parts 2/3, Listening 2: normalised answer is in `answers` (spelling must be exact, as in the exam).
   - Part 4 `kwtScore(answer, item)`: return 0 if the key word is missing or changed; return 0 if over 6 words (contractions count 2; A7). Otherwise +1 for each part where an accepted variant appears as a whole-word sequence in the answer. Result 0, 1 or 2. Review shows `fullAnswers`.
   - Self-marking: for open answers (Parts 2-4, Listening 2) the review offers "Myslím, že moje odpověď je správně". It sets `selfMarked: true` and full marks, and is shown in stats. This covers valid answers that the key misses (AI keys are never complete).
3. **Listening (F7)**: `tts.ts` checks `'speechSynthesis' in window`, loads voices (`getVoices()` + `voiceschanged`), and prefers `en-GB`, then `en-*`. It gives speaker A and B different voices when 2 or more are available. It speaks one utterance per segment (this avoids the Chrome cut-off of long utterances) and provides Play / Pause / Stop / rate 0.7-1.3 / play counter (limit 2 or unlimited). If there is no API or no English voice, it shows a Czech message plus the script (US5). The script can always be revealed after submitting.
4. **Writing (F8)**: choose a task -> textarea with live word count (warning outside 220-260), optional countdown, draft autosave -> "Zkopírovat prompt" -> `buildWritingPrompt(task, text, criteria)` -> `navigator.clipboard.writeText`. Fallback (no secure context or denied): a read-only textarea with the prompt preselected and the instruction "Ctrl+C / podržte a zkopírujte". The owner can paste feedback into a textarea, which is stored as plain text with the entry.
5. **Speaking (F9)**: show the part prompt and timer -> `recorder.ts`: feature-detect `navigator.mediaDevices?.getUserMedia` and `MediaRecorder`, choose the mime with `MediaRecorder.isTypeSupported` (`audio/webm;codecs=opus`, else `audio/mp4`, else default). Map errors: `NotAllowedError` -> "přístup k mikrofonu zamítnut", `NotFoundError` -> "mikrofon nenalezen", missing API -> "prohlížeč nahrávání nepodporuje". The blob is saved to IndexedDB, and playback uses `URL.createObjectURL` (revoked on leave). The owner types a transcript, and `buildSpeakingPrompt()` builds the self-review / claude.ai prompt.
6. **Mini mock (F10)**: pick one unused set of R&UoE Parts 1, 2, 3, 4, one of 5-8 and one Listening part (assumption A10). A countdown based on `Date.now()` (not on counting intervals) auto-submits at 0. The result is a raw score x/y and %, broken down by part, and is saved as a `mock` session. No scale score or grade (SPEC section 7).
7. **Labels (F5)**: every set header shows a badge ("AI-generated practice in the C1 Advanced format" or "Official format reference"). A persistent footer notice says "Not official Cambridge material".

## 8. Accessibility and responsive layout
- Semantic HTML: `<main>`, `<nav>`, `<h1-h3>`, and real `<button>`, `<label for>`, `<fieldset>/<legend>` for option groups. Gaps are `<select>` (Part 1/7) or `<input>` with `aria-label="Gap 3"`.
- Keyboard: everything reachable by Tab, with a visible `:focus-visible` outline. No drag and drop (selects instead). On route change, focus moves to the screen `<h1>`.
- Contrast: CSS tokens meet WCAG AA (4.5:1 text). Correct/incorrect is shown with text and an icon, not colour only.
- Live regions: score result and timers' last minute are announced with `aria-live="polite"`. Timers do not announce every second.
- `prefers-reduced-motion` is respected. `lang="en"` is set on exam text and `lang="cs"` on Czech explanations, so TTS and screen readers pronounce them correctly.
- Responsive: mobile-first single column, two columns at 900 px or wider for long text plus questions (Parts 5-8). Touch targets are 44 px or larger.

## 9. Security
- No secrets, accounts or backend, and no third-party scripts, fonts or CDNs. Everything is served from the local origin.
- **XSS**: there are no HTML sinks anywhere. `noHtmlSinks.test.ts` scans `src/**/*.ts` and fails on `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` and `new Function`. All content, the user's answers and pasted claude.ai feedback are rendered via `textContent`, with `white-space: pre-wrap` for line breaks. Pasted feedback is shown as plain text (Markdown is not rendered).
- **CSP** is injected into `index.html` at build time by a small inline Vite plugin (`apply: 'build'`, `transformIndexHtml`):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
  It is not applied in dev, because Vite injects CSS through `<style>` tags there. `npm run preview` is the production-like check.
- Backup import is treated as untrusted input. It has a size limit (10 MB), is parsed in try/catch and validated with Zod before anything is written. Unknown keys are stripped.
- Recordings and data never leave the device. The clipboard is written only on the owner's click.

## 10. Testing
Automated (Vitest, Node, `npm test`):
- `scoring.test.ts`: every part type; `normalise` edge cases; **KWT 0/1/2**: both parts = 2, one part = 1, key word missing or changed = 0, over 6 words = 0, contraction counting, alternative accepted answers, extra spaces/case.
- `weakAreas.test.ts`: n < 10 excluded, weakest 3 ordering, ties, partial marks (KWT 1/2) counted proportionally, error log = latest attempt wrong.
- `store.test.ts`: memory adapter round-trip, defaults on empty or corrupt data, quota error -> in-memory mode flag.
- `backup.test.ts`: export -> import round-trip is equal; invalid JSON, wrong `app`, wrong version and missing fields are rejected without changes.
- `prompts.test.ts`: prompt contains the task, the answer, the word count, all 4 Writing criteria (or 6 Speaking criteria) and the "AI feedback, not a Cambridge mark" sentence.
- `content.test.ts`: section 5.5.
- `mock.test.ts`: set selection, aggregation per part.
- `noHtmlSinks.test.ts`: section 9.

Manual smoke checklist (qa-engineer runs it at each milestone; about 15 min): Chrome or Edge desktop plus phone. Open each screen; complete one drill per part; keyboard-only drill; reload, then data persists; export/import; TTS with and without voices (test the fallback by forcing the "unsupported" flag via `?nospeech`); mic denied; copy prompt; `npm run preview` with the CSP and no console errors.

## 11. Run and deployment
- Primary: `npm run dev` in `projects/cae-english/`, then open `http://localhost:5173` in Chrome or Edge on this PC. Optionally `npm run build && npm run preview` for the production build.
- **Phone caveat**: `vite --host` makes the app reachable on the home Wi-Fi over plain `http://<pc-ip>`. That origin is not a secure context, so the **microphone and `navigator.clipboard` do not work there**. Drills, Listening, Writing (with the manual-copy fallback) work. Phone data is separate from PC data (move it via export/import). Full phone use would need HTTPS, for example free GitHub Pages. That means publishing a repository, which **requires owner approval** and is not planned for the MVP.
- Git: branch per feature (`feat/cae-<task>`), `npm run check` green before merge, and `node_modules/`, `dist/`, `.env*` in `.gitignore`.

## 12. Assumptions (explicit)
- A1. Main use is Chrome or Edge on Windows 11 desktop. The phone is secondary (section 11 caveat).
- A2. Local run only. No hosting in MVP (SPEC open question 6 default).
- A3. Paper vs digital is unknown, so the UI works for both: typed answers and selects, no drag and drop.
- A4. Speaking is in P2 (SPEC default).
- A5. TTS voices vary by browser. Edge offers more natural `en-GB` voices (some online voices need internet).
- A6. Czech plus English explanation is required for every auto-scored question (SPEC open question 5 not answered; the stricter option was chosen, and generation is cheap).
- A7. KWT: answers over 6 words get 0, and contractions count as 2 words. This follows common Cambridge marking practice but is **not verified** in SPEC. The education-specialist must confirm it in T02, otherwise it is turned off by a constant.
- A8. Weak areas use all attempts, not only recent ones (simplest; can add a "last 30 days" filter later).
- A9. Speaking Part 2 "pictures" are text descriptions of situations, because we have no image rights or generator. This is a known fidelity gap.
- A10. The mini mock composition and time budget (about 45-60 min) are our choice, not official.
- A11. Backup import replaces data; there is no merge in MVP.
- A12. Content volume follows the SPEC "Minimum (ship)" table. The stretch table comes after the MVP.

## 13. Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Content quality and review time (SPEC's main risk) | Wrong keys teach errors | Strict schema plus cross-field checks; small batches; education-specialist sample review; self-marking and "report issue" in the UI |
| KWT/open-cloze keys miss valid answers | Unfair 0 marks | Multiple accepted variants per part; self-mark override; issue report |
| TTS quality, voice availability, Chrome long-utterance bug | Listening only approximate | Per-segment utterances; voice choice in settings; script fallback; explicit notice |
| localStorage cleared or evicted | Progress lost | `storage.persist()`, warning, export reminder after each 10 sessions or 7 days without backup |
| Phone over http lacks mic/clipboard | Speaking and copy limited on phone | Manual copy fallback; Speaking on PC; HTTPS hosting only with owner approval |
| Schedule (1-2 weeks) | Exam prep starts late | P1 usable at end of week 1 with Parts 1-4 + 7; P2 features independent and can be cut in order: mock -> speaking -> listening 4 |
| New major versions (Vite 8, Vitest 5, Zod 4) | Setup friction | Used only through stable basic APIs; versions pinned in lockfile; checked in T01 |
