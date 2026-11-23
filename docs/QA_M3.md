# QA M3 (T32) – defect list and manual checks

Date: 2026-11-23. Scope: T21-T31, US5-US9, F7-F11 (P2). Static code review, content spot-check, automated tests. No browser. The orchestrator already verified in the browser: Listening plays and limits plays, Writing word count/autosave/prompt fallback, Speaking screen with mic denied at 360 px, mini mock auto-submit.

## Results
- `npm run check`: tsc clean, 17 test files, 193 tests passed (178 before; 15 added in `tests/qa-m3.test.ts`).
- `npm run build`: OK (185 modules, JS 465 kB / gzip 152 kB, CSS 11 kB).
- `npm run preview`: the served `/` contains exactly one CSP meta tag; the JS asset returns 200.
- CSP vs code: grep of `src/` for `.style.`, `setAttribute('style'`, `innerHTML`, `outerHTML`, `insertAdjacent`, `style:` finds nothing in code (only CSS rules). `dist/` has no `style=`. `style-src 'self'` is enough. Blob URLs for `<audio>` are allowed by `media-src blob:`.

## Defects
Blocker: none.

### Major
- **M-1 Speaking: one recorder is shared by all 4 parts, so a take can be saved to the wrong part.** `src/screens/speaking.ts:54` (`let active` is per set), `:139` (`if (active)`). Steps: Part 1 -> "Nahrávat" (mic on); without stopping, click "Nahrávat" under Part 2. Expected: Part 2 starts its own take, or is disabled while another part records. Actual: the Part 2 button runs the stop branch, so the Part 1 audio is saved as a Part 2 entry (`current` and `ensure` belong to Part 2); Part 1's button still says "Zastavit nahrávání" and "Nahrávám…" stays. Fix: disable the other parts' record buttons while `active` is set, or keep `active` per part.
- **M-2 Speaking: autosaving the transcript rebuilds the recordings list and interrupts playback.** `speaking.ts:112` (`saveText` calls `renderHistory()`), also `:131`, `:158`. Steps: record, replay the take and type the transcript while listening. Expected: playback continues. Actual: every autosave (500 ms after typing stops, and on blur) replaces the `<audio>` elements, so playback stops, open `<details>` collapse, and every recording is re-read from IndexedDB. Each rebuild also creates new object URLs (`:183`), revoked only on leaving the screen. Fix: do not re-render the list from `saveText` (update only the summary), or reuse the URL per key.

### Minor
- **m-1 Speaking: mic stays on if the user leaves during the permission prompt; double click starts two streams.** `speaking.ts:162-164`: `active` is assigned only after `await startRecording()`. (a) Click "Nahrávat" and navigate before answering the prompt: the `hashchange` handler (`:56`) sees `active === undefined`, the stream then starts and nothing stops it. (b) Double click before the prompt resolves: two `startRecording()` calls, the first recorder is lost and the mic stays open. Fix: disable `recBtn` while starting; after the await, if the button is no longer connected, stop at once.
- **m-2 Speaking: leaving the screen while recording silently discards the take.** `speaking.ts:56-57` (`void active?.stop()`, result ignored). Low impact (the user chose to leave).
- **m-3 Mini mock: leaving the page loses all answers without a warning.** `src/screens/mock.ts:62`. A nav click or Back during a long mock drops everything; no session is saved. Expected: a confirm/`beforeunload` or at least a visible note on the mock screen. Not in the AC, but it is the biggest data-loss path left.
- **m-4 Writing: "Dřívější pokusy" is not refreshed by autosave.** `src/screens/writing.ts:47-61` (`save` does not call `renderHistory`; only the feedback save does). The draft shows in the history only after a reload. Cosmetic.
- **m-5 Writing: the word count `role="status"` is announced on every keystroke.** `writing.ts:44`. The textarea already has `aria-describedby="wc"`; make the region non-live or update it only on a pause/blur.
- **m-6 Download name is always `.webm`.** `speaking.ts:179`. Safari/iOS records `audio/mp4` (`recorder.ts` MIME_PREFERENCE), so the extension would be wrong. Use the extension from the blob type.
- **m-7 Backup preview does not count Speaking entries.** `src/storage/backup.ts:57-65,108-110`. Speaking entries are restored (transcripts and feedback, covered by test); their recording is missing on the new device and the screen then says "Nahrávka není v úložišti k dispozici" (`speaking.ts:177`), which is correct. The UI does state that recordings are not included (`backup.ts:140`). Cosmetic.
- **m-8 Top navigation wraps on a phone** (known). `src/main.ts:29-37`: 8 links plus the brand take 3 lines at 360 px. Suggestion: a `<details>` menu or smaller padding. The Listening screens are reachable only from the home page.
- **m-9 Listening and Speaking screens leave `{ once: true }` global listeners until the next hashchange/pagehide.** `listening.ts:88-89`, `speaking.ts:56`. Harmless (they only stop speech or the mic); noted for the record.

## Acceptance criteria
Legend: A = automated test, M = manual (list below), X = defect.

| Criterion | Status |
|---|---|
| T21 round-trip, invalid input leaves data unchanged | A: `backup.test.ts`; `qa-m3.test.ts` (writing/speaking round-trip, wrong shape, wrong schemaVersion, `[]`, `null`) |
| T21 UI says recordings are not included; US9 | Code OK (`backup.ts:140`). M: PC -> phone import |
| T22 en-GB preference, voices A/B, counter 2/unlimited, rate, pause/stop | A: `tts.test.ts`. Chrome/Edge playback: orchestrator OK |
| T22 fallback message plus script; no errors without voices | A: `tts.test.ts` (unsupported, no-voices). UI code OK (`listening.ts:39-43,189`). M: `?nospeech` |
| T22 settings store voice and rate | Code OK (`listening.ts:49`, `home.ts:148`). Voice picker UI: M |
| T23 schema rules (3/4 options, 2x8, 1-3 words) | A: `content.test.ts`; `qa-m3.test.ts` (counts 6/8/6/10, keys in options, unique numbers) |
| T24 US5 player, play limit, script after submit, `listening` session | Limit: A `tts.test.ts` + orchestrator. Attempts/scoring: A `listening.test.ts`, `qa-m3.test.ts`. Part 4 selects and script reveal: code OK, M |
| T25 2 sets Part 3 and Part 4, about 60 questions | A: `qa-m3.test.ts` (2 sets per part; 12 + 16 + 12 + 20 = 60) |
| T26 8 tasks, labels, `format.json` with source and date | A: `qa-m3.test.ts` (4 essays + letter/proposal/report/review, 220-260, `ai-generated`), `prompts.test.ts`. `format.json` has source url and `readOn` |
| T27 prompt builder, word count, warning, timer, autosave, copy fallback, feedback as text | A: `prompts.test.ts`, `qa-m3.test.ts` (word count edges, 219/220/260/261). Autosave and fallback: orchestrator. Plain text: `h()` textContent, `<pre>`, `noHtmlSinks.test.ts`. Phone copy over http: M |
| T28 5 speaking sets, Parts 1-4, text situations | A: `qa-m3.test.ts` |
| T29 record/stop/reload/play; denied and no mic | A: `recorder.test.ts`. Browser record/replay/reload: M. Mic denied: orchestrator. X: M-1, M-2, m-1 |
| T30 timers from `format.json`, record, download, transcript, speaking prompt | A: `prompts.test.ts` (6 criteria + disclaimer). Timers: code OK (`speaking.ts:39-46`). M for the rest. X: m-6 |
| T31 selection, budget, auto-submit, per-part breakdown, raw scores only | A: `mock.test.ts`. Auto-submit: orchestrator. Raw-score notice: `mock.ts`. X: m-3 |
| US5 TTS, replay, rate, limit 2 or unlimited, fallback | Met |
| US6 task choice, word count, warning, copy prompt, feedback stored and viewable | Met (A + orchestrator); phone copy: M |
| US7 prompt, record, replay, denied does not crash, device only | Met by design (IndexedDB, `connect-src 'self'`). X: M-1, M-2 |
| US8 countdown, total plus per-part, saved to history | Met (A `mock.test.ts`, orchestrator); history in Progress: M |
| US9 persistence, export and import | Met (A); M: a real file between PC and phone |

## Accessibility review (code)
OK: every control has a label or `aria-label` (Listening gaps, Part 4 selects with `<label for>`, Writing and Speaking textareas); `lang="en"` on English content and `lang="cs"` on Czech headings inside English blocks; the player is `role=group` with a label; counters and messages are `role=status`; recorder errors are `role=alert`; timers `role=timer`; the mock countdown is `aria-hidden` with a separate polite region that announces rarely, and the result score receives focus; `<audio controls>` has an `aria-label`; results use text plus colour; tables have caption and scope; no `innerHTML` (also guarded by `noHtmlSinks.test.ts`). Issues: m-5, m-8.

## Resource and data review
- speechSynthesis: stopped on `hashchange`/`pagehide` and on submit/lock (`listening.ts:87-89`): OK.
- Timers: Writing, Speaking and mock timers stop when their element is no longer connected. The Writing debounce still fires after leaving and saves from the detached textarea (data kept); blur saves first.
- Media tracks: released on stop, error and failed start in `recorder.ts`. Leaks: m-1.
- Object URLs: revoked on `hashchange` (`speaking.ts:57-59`); growth while on the screen: M-2. The backup URL is revoked after 10 s.
- Overwrite risks: new Writing text after feedback starts a new entry; import replaces everything only after the preview and an explicit button; a failed parse leaves data unchanged. The store flushes on `pagehide`.
- Clipboard fallback uses a readonly textarea, shown only on failure. OK.

## Content spot-check
Read in full: `lis3-001`, `s-001`; structure of all Listening (8 sets), Writing (8) and Speaking (5) sets checked by script/test.
- Format fidelity: Part 1 = 3 extracts x 2 questions, 3 options (keys BCACBA, CABACB); Part 2 = 8 gaps; Part 3 = 6 questions, 4 options (BDACAD, CABDBC); Part 4 = 5 speakers x 2 tasks, 8 options, 5 different answers per task; Writing Part 1 essay with input text and 3 points, Part 2 letter/proposal/report/review, 220-260 words; Speaking Part 1 questions, Part 2 three situation texts plus question and partner question, Part 3 five options plus decision question, Part 4 six questions. Timings match `format.json`.
- Wording: every set is `ai-generated`; no "real exam" or "official" claims in Listening, Writing or Speaking; `format.json` states the criteria are paraphrases, not official descriptors. OK.
- Observations (not defects): Speaking Part 2 says "choose two of them" (in the exam the examiner assigns two of three pictures), a reasonable text adaptation (A9). Writing Part 2 gives one task per sheet, not a choice of three. No wrong keys found in the sets read.

## Tests added
`tests/qa-m3.test.ts` (15 tests, all pass): Listening sets per part, question counts, keys in options and unique numbers, Part 4 five different answers per task, key spread in Parts 1 and 3, `ai-generated` and both explanations, full key = full marks and blank = 0, whole-set attempts; Writing task set; Speaking sets (shape, label, no official-claim wording); backup round-trip of writing/speaking text and rejection of wrong shape/schemaVersion/`[]`/`null`; word count edge cases and the 219/220/260/261 boundaries.
Not added: screen behaviours M-1, M-2, m-1, m-3 need a DOM (the test environment is node; jsdom would be a new dependency, needs approval).

## Manual checks for the owner (Chrome or Edge)
1. Home -> Listening Part 1/2/3/4: Play works, the counter goes 1/2, 2/2 and the button is disabled; with "neomezeně" in Settings it never disables; the script appears after "Zkontrolovat"; the rate selector changes speed; leaving the page while it plays stops the speech.
2. Open `?nospeech` (for example `http://localhost:4173/?nospeech#/listening/1`): the message appears and the script is visible at once.
3. Writing: type 100 words (warning "kratší"), 230 (no warning), 270 ("delší"); reload: the draft is restored; "Zkopírovat prompt"; paste feedback, save, find it in "Dřívější pokusy" and after reload.
4. Phone over http (`vite --host`): "Zkopírovat prompt" shows the fallback field and you can copy; Speaking shows the https message and does not crash.
5. Speaking on the PC: record Part 1, stop, play, reload, play again, "Stáhnout nahrávku", delete (confirmation; transcript stays). Then M-1 (start Part 1, click "Nahrávat" in Part 2) and M-2 (replay a take while typing the transcript).
6. Mic blocked (lock icon) and no mic: the Czech message appears, no crash. Leave the page during the permission prompt and watch the tab's mic indicator (m-1).
7. Mini mock: with and without Listening, the countdown, "Odevzdat mock", the result per part, the review links, the history in Pokrok. `?mockSeconds=20` for auto-submit. Press Back during a mock (m-3).
8. Backup: Settings -> "Stáhnout zálohu"; import on the phone (copy the file by cable/cloud); preview, "Zrušit" leaves the data, "Nahradit" restores; a wrong file and a renamed .txt give an error and no change; the reminder disappears after export.
9. Keyboard only and a screen reader (NVDA/Narrator): player buttons, Part 4 selects, mock countdown announcements, the Writing word count (m-5), focus after submit.
10. 360 px and 900+ px: no horizontal scroll on Listening Part 4, Writing, Speaking, Mock; nav wrapping (m-8).
11. `npm run preview`: no CSP errors in the console on any screen, including playing a recording and the download.
12. Contrast spot check (AA) of `.notice`, `.mock-bar` and `.player`.

## Resolution (developer fixes, 2026-11-23)
`npm run check` (tsc + 198 tests) and `npm run build` green. New tests: `tests/qa-m3-fixes.test.ts`.
- M-1 fixed: one `owner` per screen; other parts' Record buttons are disabled with the visible note "Nahrává se jiná část. Nejdřív ji zastav." (pure `recButtonState` in `media/recorder.ts`, unit-tested). Each take is saved to the part that started it.
- M-2 fixed: transcript autosave patches only the entry's transcript `<pre>` (or prepends a new entry); `<audio>` is not recreated while typing. Full re-render only on discrete events (take saved, delete, feedback) and it revokes that part's previous object URLs.
- m-1 fixed: Record is disabled while a start is pending (double click ignored); if the user left during the prompt, the stream is stopped at once.
- m-2 fixed: leaving the screen (hashchange) stops and saves the running take to its own part (no UI re-render after leaving). Not covered: `pagehide` (tab close), an async save is not reliable there.
- m-3 fixed: while a mock runs, `beforeunload` plus a `confirm()` on in-app navigation via a small leave guard in `ui/router.ts` (cancel restores the hash with `replaceState`, no re-render). Leaving anyway still saves nothing. Browser-verified. Note: after Back + cancel the history stack position may be one step off.
- m-4 fixed: Writing history is refreshed after each autosave (textarea untouched).
- m-5 fixed: word count is no longer a live region; only the over/under-length warning sits in one `role=status` wrapper and its text changes only at threshold crossings.
- m-6 fixed: download extension from the blob mime (`extForMime`: webm/mp4/ogg).
- m-7 fixed: backup preview shows the Speaking entry count (also counted in the backup reminder).
- m-8 fixed: `.site-nav` is a single row with `overflow-x: auto`, smaller padding, links not hidden; verified at 360 px (1 row, no page horizontal overflow).
- m-9: not fixed (skipped as requested).
Not verified in a browser: real recording flow (mic blocked in the pane); lock/pending/recording button states are unit-tested, and the denied path was checked (buttons return to "Nahrávat").
