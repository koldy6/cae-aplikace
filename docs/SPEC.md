# CAE English – Product Specification (MVP)

Status: DRAFT, awaiting owner approval. Date: 2026-11-22.

## 1. Goal
Help the owner pass Cambridge C1 Advanced (CAE) within about one month. The app focuses on exam score impact: lots of auto-scored practice with explanations, plus structured self-assessment for Writing and Speaking that uses the owner's existing Claude Pro chat (no paid API).

## 2. User
One person (the owner). Czech speaker, learning English at roughly B2-C1. No accounts, no login, no user management, no backend user data. UI and explanations in Czech where helpful; exam tasks in English.

## 3. Constraints (binding)
- Zero budget for AI APIs. The app must NOT call any paid AI service.
- Practice content is pre-generated in the studio by Claude and shipped as static data files (with answer keys and explanations). Each item is labelled `ai-generated` or `official-format-reference` (see section 7).
- AI feedback (Writing, Speaking) = the app builds a ready-made prompt; the owner copies it to claude.ai and optionally pastes the feedback back.
- Free browser features allowed: Web Speech API (text-to-speech), MediaRecorder (recording), localStorage/IndexedDB.
- Web app, responsive for desktop and phone. Installable PWA is nice-to-have, not MVP.
- Timeline: exam within one month; MVP usable in 1-2 weeks of development.
- Project rules: follow official C1 Advanced format, never present AI items as official Cambridge material, always explain mistakes, explain in Czech when helpful.
- No technology choice in this document.

## 4. Exam overview (`official-format-reference`, verified 2026-11-22)
Which format applies in December 2026: the current C1 Advanced format below (4 papers, about 4 hours). We found no official Cambridge announcement of a shortened or revised C1 Advanced exam for 2026. The official format page (read 2026-11-22) describes this format, says it is the same for paper-based and digital, and mentions no upcoming change. The draft's claim about a "shortened 2026 format" was not confirmed and has been removed. The only 2025-2026 changes we found do not affect content or scoring:
- From 1 Nov 2025, digital Listening Part 4 (multiple matching) is answered by drag and drop. The task is unchanged. (support.cambridgeenglish.org, notice "Change to the format for Cambridge English Digital Listening tests November 2025", seen in search results 2026-11-22. The page returned 403 when fetched directly.)
- From 6 Apr 2026, the Statement of Results carries a mandatory test-day photo and clearer wording about Grade A. Assessment and scoring are unchanged. (swiss-exams.ch/news-blog/cambridge_english_certificate_update, read 2026-11-22. The official helpdesk article returned 403.)

Main source: https://www.cambridgeenglish.org/exams-and-tests/advanced/exam-format/ (read 2026-11-22). Unless a line says otherwise, the facts below come from this page.
- Reading and Use of English: 1 h 30 min, 8 parts, 56 questions, 78 raw marks. Texts total about 3,000-3,500 words.
  1. Multiple-choice cloze, 8 Q, options A-D, 1 mark each.
  2. Open cloze, 8 Q, one word per gap, 1 mark each.
  3. Word formation, 8 Q, 1 mark each.
  4. Key word transformation, 6 Q. The answer is 3-6 words including the given key word. Up to 2 marks each. (The draft said 1-3 marks, which was wrong.)
  5. Multiple choice on a long text, 6 Q, options A-D, 2 marks each.
  6. Cross-text multiple matching (four short texts), 4 Q, 2 marks each.
  7. Gapped text (removed paragraphs), 6 Q, 2 marks each.
  8. Multiple matching, 10 Q, 1 mark each.
- Writing: 1 h 30 min, 2 parts, 220-260 words each.
  - Part 1 (compulsory) is an essay based on an input text. The candidate discusses the points and explains which is more important, giving reasons. The draft also said "plus one own point", which is not in the official description and has been removed. Unverified: whether the input lists three points and the candidate chooses two. We could not open the handbook PDF to check.
  - Part 2: one task from a choice of three. Task types are letter/email, proposal, report and review. Article is not a C1 Advanced Part 2 type on the official page, so it has been removed from the draft.
- Listening: about 40 min, 4 parts, 30 Q, 1 mark each. **Each recording is played twice.**
  1. Three short extracts from conversations, 2 Q each, options A-C (6 Q).
  2. Monologue of about 3 min, sentence completion (8 Q).
  3. Conversation of about 4 min, multiple choice A-D (6 Q).
  4. Five short themed monologues of about 30 s each, two matching tasks with 8 options each (10 Q).
- Speaking: 15 min per pair (23 min for a group of three), with two examiners (interlocutor and assessor).
  1. Interview, about 2 min.
  2. Long turn: about 1 min per candidate on two of three pictures, plus about 30 s comment by the partner.
  3. Collaborative task: about 2 min discussion plus about 1 min decision.
  4. Discussion, about 5 min.
- Scoring:
  - Results are reported on the Cambridge English Scale. The official results summary gives 180-199 as the C1 range (https://cambridgeenglish.org/exams-and-tests/advanced/results, read 2026-11-22).
  - Grade bands: A 200-210 (certificate at C2), B 193-199 (C1), C 180-192 (C1), 160-179 (B2 certificate), below 160 no certificate. These come from official cambridgeenglish.org results pages as shown in search results (2026-11-22). We could not open the full table or the factsheet PDF (664448, dated 05/2026), so the B/C split at 192/193 is unverified.
  - Unverified this session: separate scale scores for Reading, Use of English, Writing, Listening and Speaking, with the overall score as their average (equal weighting). This is long-standing practice, but we could not open an official page to confirm it.
- Writing criteria: Content, Communicative Achievement, Organisation and Language, each marked 0-5 (Cambridge "Teacher guide for writing C1 Advanced", https://www.cambridgeenglish.org/Images/600976-teacher-guide-for-writing-c1-advanced.pdf, seen in search results 2026-11-22).
- Speaking criteria: Grammatical Resource, Lexical Resource, Discourse Management, Pronunciation and Interactive Communication, marked by the assessor, plus Global Achievement marked by the interlocutor. The draft's "Grammar and Vocabulary" was B2-level wording. (Source: https://www.cambridgeenglish.org/images/167865-cambridge-english-advanced-cae-speaking-assessment-scales.pdf and "Teacher guide for speaking C1 Advanced" 735851, seen in search results 2026-11-22.)

## 5. MVP features and priority
Priority rationale: Reading and Use of English is the largest block of marks and is fully auto-scorable; Listening is auto-scorable; Writing and Speaking cannot be auto-scored and rely on prompt export.

### P1 (week 1) – auto-scored core
- F1. Practice by exam part: Reading and Use of English Parts 1-4 (use of English, fastest score gains) and Parts 5-8, each as a short drill (single item set), instant scoring.
- F2. Answer review: for every question show correct answer, a short explanation in Czech/English, and the question-type tag.
- F3. Progress and error log (local only): results per session, per part and question type; list of mistakes to retry.
- F4. Weak-area view: accuracy per part and question type, highlighting the weakest 3.
- F5. Content labelling: every item shows its origin label and a general notice that it is not official Cambridge material.
- F6. Responsive layout, works on phone and desktop, works offline after first load is nice-to-have.

### P2 (week 2) – Listening, Writing, Speaking, mock
- F7. Listening practice Parts 1-4 using browser text-to-speech reading a script (replay control, speed control); same scoring and review as F1/F2. Note: TTS is not exam-quality audio (see risks).
- F8. Writing helper: pick a task (Part 1 essay, Part 2 variants), write in a text box with live word count (220-260 target) and an optional timer; one click builds a prompt for claude.ai containing the task, the answer, and the four assessment criteria with a request for band-style feedback, corrections and a rewritten model paragraph. Owner may paste feedback back to store it.
- F9. Speaking helper: show Part 1-4 prompts, record answers with a timer, play back, and build a self-review or claude.ai prompt (the owner types or pastes a transcript, since the app does not transcribe; see open questions).
- F10. Mini mock: timed set across Reading and Use of English parts and Listening, with a total score and per-part breakdown. Full 90-minute mock is Later.
- F11. Export/import of progress data as a file (backup), because data is only local.

## 6. Out of scope (MVP) and Later
Out of scope for MVP:
- Accounts, login, multi-user, cloud sync, backend.
- Any paid AI API call or in-app AI tutor/chat.
- Automatic grading of Writing and Speaking; speech-to-text transcription; pronunciation scoring.
- Real Cambridge past papers or copyrighted material.
- Full-length 4-skill mock exams with official timing.
- Spaced repetition engine, gamification, notifications.

Later (after MVP / after exam):
- Installable PWA with full offline mode.
- Vocabulary and collocation trainer with spaced repetition; phrasal verbs and grammar modules with Czech explanations.
- Full mock exams; score-to-Cambridge-scale estimate.
- Higher quality listening audio (pre-generated files) if a free source is found.
- Optional AI tutor if a free/local option ever becomes available.

## 7. Content requirements
Labels (shown on every item):
- `ai-generated`: written by Claude in this studio, modelled on the official format. Default for all MVP content.
- `official-format-reference`: official format descriptions, rubrics and task instructions paraphrased from public Cambridge sources (cite source in the data). Not actual exam questions.
- Never label anything "official Cambridge question". No copying of past papers.
- Use the wording "practice in the C1 Advanced format" for AI items. Avoid "real exam", "authentic" or "official test" for anything `ai-generated`.
- Show mini-mock and drill scores as raw practice scores (x/y, %). Do not convert them to the Cambridge English Scale or a grade, since the app has no official conversion. If any estimate is added Later, label it "rough unofficial estimate".
- Paraphrase `official-format-reference` text in our own words, with source URL and date read. Do not copy the handbook, assessment scales or sample papers verbatim beyond short criterion names.
- The Writing/Speaking prompts sent to claude.ai must say that the feedback is AI feedback, not a Cambridge mark.

Realistic MVP volume (Claude generates; each with key and explanation; quality-reviewed by the education specialist on a sample):
| Part | Items for MVP |
|---|---|
| R&UoE 1 Multiple-choice cloze | 10 texts (80 Q) |
| R&UoE 2 Open cloze | 10 texts (80 Q) |
| R&UoE 3 Word formation | 10 texts (80 Q) |
| R&UoE 4 Key word transformation | 60 Q |
| R&UoE 5 Multiple choice | 4 texts (24 Q) |
| R&UoE 6 Cross-text matching | 3 sets (12 Q) |
| R&UoE 7 Gapped text | 4 texts (24 Q) |
| R&UoE 8 Multiple matching | 4 sets (40 Q) |
| Listening 1-4 | 4 sets each, scripts for TTS (about 120 Q) |
| Writing tasks | 12 (6 essays, 6 Part 2: letter/email, proposal, report, review) |
| Speaking prompts | 8 sets covering Parts 1-4 |
Content priority: R&UoE Parts 1-4 and 7 first (ship in P1), the rest follows. Numbers are a target; fewer high-quality items beat more weak ones.

Feasibility note (domain review 2026-11-22): generating this volume is easy. Quality review is not. Part 5-8 and Listening each need texts of about 600-900 words, plus distractors that are plausible but clearly wrong. Each such text takes noticeably longer to check than a cloze. Recommended minimum release for each phase, with the table above as stretch:
| Part | Minimum (ship) |
|---|---|
| R&UoE 1, 2, 3 | 6 texts each (48 Q each) |
| R&UoE 4 | 36 Q |
| R&UoE 5, 7 | 3 texts each |
| R&UoE 6, 8 | 2 sets each |
| Listening 1-4 | 2 sets each part (about 60 Q) |
| Writing | 8 tasks (4 essays, one of each Part 2 type) |
| Speaking | 5 sets |
Content rules for official-format fidelity:
- Part 1 has 4 options (A-D).
- Part 2 gaps take exactly one word.
- Part 4 answers are 3-6 words including the unchanged key word.
- Listening Part 1 has 3 options and Part 3 has 4.
- Listening Part 4 has 2 tasks with 8 options each.
- Listening Parts 1 and 3 are dialogues. TTS needs two distinct voices where the browser offers them; otherwise the speakers are labelled in the script.

Each item data fields (logical, not technical): id, part, question type, text/stem, options, correct answer, explanation (Czech plus English), label, difficulty (optional).

## 8. User stories and acceptance criteria

US1. As the owner, I want to drill a chosen Reading and Use of English part so I can practise my weak parts.
- I can select any of Parts 1-8 from the home screen in at most 2 taps.
- Answers are scored on submit; the score "x/y" is displayed.
- Format of each part matches the description in section 4 (number of options, gap style).

US2. As the owner, I want to understand every mistake.
- After submit each question shows my answer, the correct answer and an explanation.
- Each wrong answer is saved to the error log with part and question type.
- Key word transformations accept stated alternative correct answers and show the accepted ones. They are scored 0-2, mirroring the official 2-mark split. The key defines two parts for each item, and a partly correct answer earns 1 mark.

US3. As the owner, I want to see my weak areas.
- A screen lists accuracy per part and question type (e.g. "Part 3 word formation: 55%").
- The 3 weakest types with at least 10 answered questions are highlighted.
- I can start a retry drill made only from my previously wrong items.

US4. As the owner, I want to know what is official.
- Every item displays its label; a notice states no item is an actual Cambridge exam question.
- No item has a label claiming to be official exam content.

US5. As the owner, I want listening practice without paid audio.
- Listening items play script via text-to-speech with replay and speed control; I can limit plays to the exam standard (twice, which is the official rule; see section 4) or unlimited.
- If the browser has no speech support, the app shows a clear message and the script as fallback.

US6. As the owner, I want Writing feedback without paying for an API.
- I can choose a task, write, see the word count, and get a warning outside 220-260 words (official range for both parts, see section 4).
- "Copy prompt" produces text with task, my answer and the assessment criteria; copy succeeds on desktop and phone.
- I can paste feedback back; it is stored with the answer and viewable later.

US7. As the owner, I want to rehearse Speaking.
- I can see a Speaking prompt, record my answer (with mic permission), and replay it.
- If the microphone is denied or unavailable, a clear message is shown and the app does not crash.
- Recordings stay on my device only.

US8. As the owner, I want a quick timed mock.
- A mini mock runs with a visible countdown and produces a total score and per-part breakdown saved to history.

US9. As the owner, I do not want to lose my data.
- Progress persists after closing the browser.
- Export creates a file and import restores history from that file.

## 9. Progress and error tracking (MVP, local only)
- Stored on the device: attempts (date, part, question type, correct/incorrect, time), writing texts and pasted feedback, recording references, mock results.
- Metrics: accuracy per part and question type, last 7 days activity, days to exam (owner enters exam date), streak not needed.
- Weak-area detection: simple rule by question type (lowest accuracy, minimum sample size 10), no machine learning.
- Backup via export/import (F11). Data may be lost if the browser storage is cleared; the app warns about this.

## 10. Risks
- Text-to-speech does not match exam audio (accents, speed, background); Listening practice is only approximate.
- AI-generated items may contain errors or unnatural options; mitigate with sample review and a "report issue" flag stored locally.
- Content volume is the main time risk, not code.

## 11. Open questions for the owner
1. What is the exact exam date, and is it paper-based or digital (computer)? The format is the same either way. Digital affects how answers are entered (typed Writing, drag and drop in Listening Part 4) and could shape the UI. Which target score (180 or higher, grade)? The domain review found no 2026 revised format (section 4).
2. Which sections are weakest right now? (We would prioritise content accordingly.)
3. Is Speaking prep needed in MVP, or should Speaking move to Later?
4. For Speaking and Writing, is copy-paste into claude.ai acceptable, or is a "self-checklist" only version enough? Is the owner willing to paste a typed transcript of the recording?
5. Is Czech explanation required for every item, or only for grammar/use of English?
6. Hosting: is a locally run or free static hosting acceptable? (Decision for the architect, needs owner approval to publish.)
7. Is the quick mini mock enough, or is a full 4-skill mock essential before the exam?
8. Is offline use on the phone important (PWA moves from Later to P2)?

## 12. Domain review (2026-11-22)
Reviewer: Cambridge exam specialist agent. All sources were read or seen on 2026-11-22.

Verified against official Cambridge sources:
- No revised or shortened C1 Advanced format was found for 2026. The current format applies to a December 2026 sitting, and the format is the same for paper-based and digital. Source: https://www.cambridgeenglish.org/exams-and-tests/advanced/exam-format/ (fetched).
- That page also confirms the details of all four papers: Reading and Use of English (8 parts, 56 Q, 90 min, marks per part), Writing (2 parts, 220-260 words, Part 2 task types), Listening (4 parts, 30 Q, about 40 min, played twice) and Speaking (4 parts, 15 min per pair, part timings).
- C1 range 180-199 on the Cambridge English Scale. Source: https://cambridgeenglish.org/exams-and-tests/advanced/results (fetched).
- Writing criteria: Content, Communicative Achievement, Organisation, Language, each 0-5. Source: https://www.cambridgeenglish.org/Images/600976-teacher-guide-for-writing-c1-advanced.pdf (seen in search results).
- Speaking criteria: Grammatical Resource, Lexical Resource, Discourse Management, Pronunciation, Interactive Communication, plus Global Achievement. Source: https://www.cambridgeenglish.org/images/167865-cambridge-english-advanced-cae-speaking-assessment-scales.pdf (seen in search results).
- Digital Listening Part 4 uses drag and drop from 1 Nov 2025. Source: support.cambridgeenglish.org article 29370084389906 (seen in search results; the page returned 403 when fetched).
- Results documents changed from 6 Apr 2026: photo and wording only, no change to the exam. Source: https://swiss-exams.ch/news-blog/cambridge_english_certificate_update (an exam-centre page, not Cambridge; the official helpdesk article returned 403).

Corrections made to the draft:
- Removed the "shortened 2026 format" claim.
- Key word transformation is up to 2 marks per question, not 1-3.
- Removed "article" from Writing Part 2 task types.
- Removed "plus one own point" from Writing Part 1.
- Speaking criteria: replaced "Grammar and Vocabulary" with Grammatical Resource, Lexical Resource and Global Achievement.
- Added option counts and answer lengths to the content rules.

Still unverified:
- Grade A/B/C band boundaries (200-210 / 193-199 / 180-192) and the 160-179 B2 band. These are from search summaries of official pages; we could not open the full results table or factsheet PDF 664448.
- Equal weighting of the five skill scores, with the overall score as their average.
- Exact Writing Part 1 input structure (three points, choose two?). The handbook PDF (https://www.cambridgeenglish.org/Images/167804-c1-advanced-handbook.pdf) was too large to fetch.
- Raw-mark-to-scale conversion: we found no official fixed conversion table, so the app must not show one.
