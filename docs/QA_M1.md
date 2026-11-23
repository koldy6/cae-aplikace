# QA M1 (T17) – defect list and manual checks

Date: 2026-11-23. Scope: P1 (F1-F6, US1-US4, T03-T16), static review of code and content plus automated tests. No browser was used.

## Results
- `npm run check`: tsc clean, 9 test files, 76 tests passed (69 before; 7 added in `tests/qa-m1.test.ts`).
- `npm run build`: OK (131 modules, JS 186 kB / gzip 59 kB, CSS 9.8 kB). `dist/index.html` contains the CSP meta tag.

## Defects

### Major
- **M-1 Content: Part 1 keys are all "A".** `rue1-001`, `rue1-002`, `rue1-003`: answers are AAAAAAAA in every set (24 of 24). Guessing "A" scores 100 %. Expected: keys spread over A-D. Fix in the content (edu): reorder options.
- **M-2 Content: Part 7 keys are in gap order and G is always the extra.** `rue7-001` and `rue7-002`: answers are A,B,C,D,E,F, extra paragraph G. The task can be solved by order alone. Expected: shuffled paragraph order, extra paragraph not always last. Fix in the content (edu).
- **M-3 Part 4 (KWT) has no "Myslím, že je to správně".** `src/screens/review.ts:44`: `isOpen` (`src/domain/drill.ts`) is true only for Parts 2 and 3. ARCHITECTURE section 6 (line 199) says self-marking covers Parts 2-4, and the risk table (line 259) relies on it for KWT keys that miss valid answers. Steps: Part 4 drill, enter a valid answer not in `fullAnswers`, open the review. Expected: the self-mark button. Actual: only "Nahlásit chybu". T13 AC text says "open answers", so this is a gap against the architecture. Fix: `isOpen = part 2|3|4`. The button then appears for 1/2 marks as well, and `selfMarkAttempt` gives 2/2.
- **M-4 Review of a retry session shows non-retried questions as "Špatně".** `src/screens/review.ts:35` iterates all `questionsOf(set)`, but a retry session only has attempts for the retried gaps (`buildAttempts(..., only)`). Steps: make 2 mistakes in a set, run the retry, click "Zobrazit vysvětlení". Expected: only the retried questions are listed. Actual: all 8 questions are listed, the others as "Špatně" with an empty answer and no self-mark button, and the session score is x/2. This is misleading. Fix: filter `qs` to questions that have an attempt in the session.
- **M-5 Enter in a text field submits the whole drill.** `src/screens/drill.ts:156`: the form has a submit button, so Enter in any Part 2, 3 or 4 input fires `onSubmit`. It saves the attempts with blank answers as wrong, locks the inputs and pollutes the weak-area stats. No confirmation and no undo. Expected: Enter moves to the next gap or does nothing. (Needs the manual check on item 6.)

### Minor
- **m-1 Weak-area item shows the percentage twice** (known). `src/screens/progress.ts:67` plus `formatArea` already ends with "55 %".
- **m-2 `<html lang="en">`, but the shell is Czech** (`index.html:2`, nav and buttons in `main.ts`, screens). Czech text is read with an English voice. Expected: `lang="cs"` on the shell, and `lang="en"` on the English spans (the exam content already has it). The footer sets `lang=cs` on its Czech span, so it would need the opposite change.
- **m-3 Focus is lost after submit.** `src/screens/drill.ts:142-144`: the submit button (focused) and all the inputs become disabled, so focus falls back to `<body>`. A keyboard user has to tab from the top. Expected: focus on the score or on the "Zobrazit vysvětlení" link. The score is announced through `aria-live`, so it is not a blocker.
- **m-4 Retry Part 7: duplicates are checked only among active gaps** (`flagDuplicates` sees only `controls`; read-only gaps are not counted). A paragraph already used by a read-only gap can be picked again without a warning.
- **m-5 Weak-area table highlights weak rows by class only** (`progress.ts:78`, `.is-weak`). The top list uses a text rank and a dashed border; the table has nothing besides the style. Expected: a text marker (for example "nejslabší") in the row. Needs a look at the CSS in the browser.
- **m-6 Content (open) – possible missing accepted answers (low risk, the self-mark button helps for Parts 2/3):** `rue4-001` #5 accepts only "how difficult", not "how hard/tough" (a natural synonym). `rue4-001` #4 rejects "must not have seen" (intentional, noted in the explanation). `rue2-003` #7 explanation: "'Despite' does not take 'of', so it cannot go before 'spite'" is confusingly worded.
- **m-7 Type tag inconsistency.** `rue1-003` Q2 "contribution" is typed `dependent-preposition`, but the gap tests the `make a contribution` collocation. This slightly skews the weak-area statistics.

## Acceptance criteria
Legend: A = automated test, M = manual (orchestrator), X = defect.

| Criterion | Status |
|---|---|
| US1 any of Parts 1-8 in 2 taps | M: home tile -> set list -> drill is 2 taps by code (`home.ts`); Parts 5, 6 and 8 are "připravujeme" (expected for M1) |
| US1 score x/y on submit | A: `drill.test.ts` "scores a Part 1 drill"; aria-live: code `drill.ts` (`.score[aria-live]`) |
| US1 format matches section 4 | A: `content.test.ts` (option count, one-word gaps, 3-6 words, 6 gaps + 1 extra); my `qa-m1.test.ts` checks the keys against the options |
| US2 my answer / correct / explanation | M (review screen, code reviewed OK) |
| US2 wrong answer to error log with part and type | A: `drill.test.ts` (attempt part/type), `weakAreas.test.ts` errorLog |
| US2 KWT alternatives shown, scored 0-2 | A: `scoring.test.ts` kwtScore, `qa-m1.test.ts` (all fullAnswers = 2); shown in review: `correctText` joins `fullAnswers` OK. Self-mark: X M-3 |
| US3 per part and type accuracy list | A: `weakAreas.test.ts` areaStats; screen: M |
| US3 weakest 3 with n >= 10 | A: `weakAreas.test.ts` (n=9/10, order, ties, partial marks) |
| US3 retry drill from wrong items | A: `progress.test.ts`, `qa-m1.test.ts` (retry attempts, error log); screen: M; X M-4 |
| US3 corrected question leaves the log | A: `progress.test.ts` "retry removes corrected questions", `qa-m1.test.ts` |
| US4 label on every item and the notice | footer on every screen (`main.ts` + `components.ts`): M; label badge on the set list, drill and review: code OK; wording check: A `content.test.ts` (forbidden words) |
| F1 drills for Parts 1-4, 7 | A + M (see above) |
| F2 review: answer, explanation, tag | code OK (`review.ts`); M |
| F3 progress and error log (local) | A: `store.test.ts`, `progress.test.ts`; M: reload persistence |
| F4 weak areas | A (see US3) |
| F5 labelling | A + code OK |
| F6 responsive, phone | M (360 px, 900 px breakpoint, `vite --host`) |
| T10 router, focus on h1, back button | M; guard A: `noHtmlSinks.test.ts` |
| T11 days to the exam | A: `drill.test.ts` daysToExam; the settings form: M |
| T12 labels for gaps, aria-live, 360 px | code OK (`aria-label` on every gap, Part 3 includes the stem); M for 360 px |
| T13 self-mark, report issue | M. Self-mark A: `drill.test.ts`. Parts 2/3 only, see M-3. The issue form has a `<label>` and moves focus: code OK |
| T14 KWT 0/1/2, Part 7 2 marks per gap | A: `drill.test.ts` Part 4/7 attempts, `scoring.test.ts` |
| T15 weak-area module | A: `weakAreas.test.ts` |
| T16 screens, retry | M; see M-4, m-1 |

## Accessibility review (code)
OK: skip link; `<nav aria-label>`; one `<h1>` per screen, focus on `<h1>` after navigation; every gap, KWT input and the issue textarea has a label; `lang` on English content and on the `cs` explanations; result states carry an icon and text (review `✓/✗` plus "Správně/Špatně"; gaps `::after` "✓ correct" / "✗ incorrect"); `aria-live=polite` for the score in the drill and review; tables with `<caption>`, `scope`; all interactive elements are native (`a`, `button`, `select`, `input`); `prefers-reduced-motion` handled; tap target `--tap`.
Issues: m-2, m-3, m-5. Disabled tiles on home use `<a role=link aria-disabled tabindex=-1>` without `href`: acceptable, and they are skipped by Tab (the text "připravujeme" is readable by a screen reader).

## Manual checks for the orchestrator (browser, Chrome or Edge)
1. Home -> Part 1 -> set -> drill is at most 2 taps; Parts 5, 6, 8 show "připravujeme" and cannot be reached with Tab.
2. Keyboard only: Tab through nav, skip link ("Přeskočit na obsah" is visible on focus), Part 1 selects (arrow keys), Part 2/3 inputs, Part 4 inputs, Part 7 selects; submit; focus after submit (m-3); the browser back button returns to the part screen and the focus goes to the `<h1>`.
3. Press Enter inside a Part 2 / 3 / 4 input: confirm M-5.
4. Drill at 360 px width and at 900+ px: no horizontal scroll, Part 7 paragraph list readable, KWT line wraps.
5. Submit with blanks and with all correct answers: the score "x/y" appears and is announced (screen reader or at least visible).
6. Review: the state is readable without colour (use a grayscale emulation); EN and CZ explanations; "Myslím, že je to správně" updates the score and the status; "Nahlásit chybu" saves and the form disappears (check `localStorage` key `cae-english:v1`, field `issues`).
7. Retry: make 2 mistakes, open Opakování, retry (other gaps read-only), correct one -> it leaves the list. Open the review of the retry session (M-4).
8. Weak areas with fewer than 10 answers: the "Zatím není dost dat" note and the "*" mark; after 10+ answers in one type: the top list, the percentage shown twice (m-1).
9. Reload: sessions, the exam date and the progress persist. Settings: set and clear the exam date, check the home countdown.
10. Private window or blocked storage: the banner "Prohlížeč neumožňuje ukládání" appears.
11. `npm run preview`: no CSP errors in the console on any screen.
12. Contrast spot check (AA) of the badges, the `.notice` and `.is-incorrect` colours with DevTools.
13. Phone via `vite --host` over http: drill works, select and inputs usable, no zoom on focus (inputs 16 px or larger).

## Tests added
`tests/qa-m1.test.ts` (7 tests, all pass): every key and accepted answer scores full marks; every KWT `fullAnswer` = 2; the key word alone or blank = 0; Part 1 keys exist among the options and Part 7 keys among the paragraphs; blank or wrong letter = 0 for every question; retry attempts (`only`) and error-log clearing. Not added: a "keys are not all the same letter" test, because it would fail on today's content (M-1, M-2); add it with the content fix.

## Content spot-check
Checked fully: `rue1-001`, `rue1-003`, `rue2-001`, `rue2-003`, `rue3-001`, `rue3-002`, `rue4-001`, `rue4-003`, `rue7-001`, `rue7-002`. Every key matches its explanation, and the distractors are clearly wrong. No wrong keys found. Findings: M-1, M-2, m-6, m-7. The Part 4 splits (2 marked parts) are consistent, and the word counts are within 3-6 (`content.test.ts`).

## Resolution (2026-11-23)

All 5 major and 7 minor defects fixed the same day (app: developer; content: education-specialist).
Orchestrator browser checks: keyboard-only pass (skip link, labels, visible focus, live word count, Enter no longer submits), M-4 retry review lists only retried questions (7 of 8), Part 1 options intact, no console errors. Test suite: 81 tests green, including new `contentBalance.test.ts` guarding against predictable key patterns.
Not checked: real phone via `vite --host` (needs the owner's phone).
