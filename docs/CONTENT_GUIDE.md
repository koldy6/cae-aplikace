# CAE English – Content Guide

Status: T02, written by education-specialist 2026-11-23. Inputs: `SPEC.md` (sections 4, 7, 12), `ARCHITECTURE.md` (sections 5, 12).
Audience: whoever writes or reviews content files in `src/content/data/` and the developer writing `src/content/tags.ts`.

## 1. Ground rules
- All practice content is labelled `ai-generated` (SPEC §7). Only format descriptions, criteria names and timings paraphrased from public Cambridge pages may be labelled `official-format-reference`, and they need `source.url` and `source.readOn` (SPEC §7, ARCHITECTURE §5.1).
- Never copy or closely imitate Cambridge past papers, sample papers or handbook texts (SPEC §6, §7). Write new texts on new topics.
- The format facts each part must follow are in SPEC §4 and the content rules in SPEC §7. This guide does not add new format facts. Where it sets a rule that is not in SPEC, the rule is marked **(app convention)**.
- **The tags below are a teaching taxonomy for this app (app convention).** Cambridge does not publish an official list of question types per part. The tags only drive weak-area statistics (ARCHITECTURE §5.1, §6).

## 2. Question-type tags
Rules for tags (ARCHITECTURE §5.1):
- kebab-case, lowercase ASCII, from this list only. `tags.ts` holds the same list per (paper, part).
- Each question gets exactly one tag: the main thing it tests. If two fit, use the one the explanation is about.
- The same tag name may appear in several parts (e.g. `fixed-phrase`). Stats group by (paper, part, type), so it is counted separately per part.

### 2.1 Reading and Use of English

**Part 1 – Multiple-choice cloze** (8 Q, A-D, SPEC §4) – 7 tags
| Tag | Definition |
|---|---|
| `collocation` | Only one option combines naturally with a nearby word (e.g. *heavy* traffic, *pose* a threat). |
| `fixed-phrase` | The gap is part of a fixed expression or idiom that does not change (e.g. *by and large*, *in the long run*). |
| `phrasal-verb` | The options are verbs or particles, and only one forms the phrasal verb with the right meaning. |
| `linking` | The options are linkers or discourse markers, and only one fits the logic of the sentence (contrast, cause, addition). |
| `meaning-in-context` | The options are near-synonyms, and only one has the precise meaning or connotation the context needs. |
| `dependent-preposition` | Only one option takes the preposition that follows or precedes the gap (e.g. *capable of*, *aware of*). |
| `verb-pattern` | Only one option fits the grammar that follows: gerund, infinitive, object + infinitive, or *that*-clause (e.g. *deter sb from doing*). |

**Part 2 – Open cloze** (8 Q, one word per gap, SPEC §4, §7) – 11 tags
| Tag | Definition |
|---|---|
| `article-determiner` | The missing word is an article or determiner (*a, the, this, such, every, each*). |
| `preposition` | The missing word is a preposition, either free or dependent. |
| `pronoun` | The missing word is a personal, reflexive, impersonal or dummy pronoun (*it, there, one, themselves*). |
| `relative-pronoun` | The missing word introduces a relative clause (*which, whose, whom, where*). |
| `auxiliary-verb` | The missing word is an auxiliary or modal (*have, been, did, would*), including in passives and perfect forms. |
| `linking` | The missing word is a conjunction or linker (*although, unless, whereas, despite*). |
| `quantifier` | The missing word expresses quantity (*few, little, much, several, all*). |
| `comparison` | The missing word builds a comparative or similar structure (*than, as, more, the ... the*). |
| `phrasal-verb` | The missing word is the verb or particle of a phrasal verb. |
| `fixed-phrase` | The missing word completes a fixed expression (*as a matter of fact*, *on the whole*). |
| `inversion` | The missing word is part of inverted word order or a fronted negative (*Not only*, *Rarely*, *Had I known*). |

**Part 3 – Word formation** (8 Q, stem word given, SPEC §4) – 6 tags
| Tag | Definition |
|---|---|
| `noun-formation` | The stem must become a noun, including plurals and spelling changes (*long* -> *length*). |
| `adjective-formation` | The stem must become an adjective (*-able, -ive, -ous, -al*). |
| `adverb-formation` | The stem must become an adverb, usually via an adjective (*-ly, -ally, -ward(s)*). |
| `verb-formation` | The stem must become a verb (*en-, -en, -ise, -ify*), in the right form. |
| `negative-prefix` | The answer needs a negative or opposite prefix (*un-, in-, im-, ir-, dis-, mis-*). This tag wins over the word-class tags. |
| `compound-word` | The answer combines the stem with another element (*break* -> *breakthrough*, *out-*, *over-*, *under-*). |

**Part 4 – Key word transformation** (6 Q, 3-6 words including the key word, up to 2 marks, SPEC §4, §7) – 13 tags
| Tag | Definition |
|---|---|
| `conditional` | The rewrite uses a conditional or a conditional substitute (*unless, provided, but for, otherwise*). |
| `passive` | The rewrite turns active into passive or the reverse, including *it is said that / is said to*. |
| `reported-speech` | The rewrite reports speech with a reporting verb and its pattern (*accused sb of, insisted on*). |
| `modal-verb` | The rewrite uses a modal for obligation, possibility or deduction (*must have, needn't have, can't have*). |
| `comparison` | The rewrite uses a comparative or equative structure (*nowhere near as, by far the, the more ... the*). |
| `inversion` | The rewrite uses inversion after a negative or limiting adverbial (*Hardly had, Not until, Only when*). |
| `wish-regret` | The rewrite expresses a wish, regret or unreal past (*wish, if only, would rather, it's time*). |
| `causative` | The rewrite uses *have/get something done*. |
| `verb-pattern` | The rewrite depends on gerund vs infinitive or another verb complement (*avoid doing, manage to*). |
| `phrasal-verb` | The key word or the answer is a phrasal verb that replaces a single verb or phrase. |
| `fixed-phrase` | The rewrite uses an idiom, collocation or fixed expression built on the key word (*take into account, at short notice*). |
| `linking` | The rewrite replaces one linker with another and changes the structure (*although* -> *despite*). |
| `nominalisation` | The rewrite turns a verb or adjective into a noun phrase (*decided* -> *made a decision*). |

**Part 5 – Multiple choice on a long text** (6 Q, A-D, SPEC §4) – 7 tags
| Tag | Definition |
|---|---|
| `detail` | The answer is a specific fact or point stated in one part of the text. |
| `gist` | The answer is the main idea of a paragraph or of the whole text. |
| `attitude-opinion` | The answer is the writer's or a quoted person's attitude, opinion or tone. |
| `inference` | The answer is implied, not stated; it must be worked out from the text. |
| `purpose-function` | The answer is why the writer includes a sentence, example or paragraph. |
| `reference` | The answer is what a word or phrase (*this, it, such a view*) refers to. |
| `meaning-in-context` | The answer is what a word or phrase means in this text. |

**Part 6 – Cross-text multiple matching** (4 texts, 4 Q, SPEC §4) – 3 tags
| Tag | Definition |
|---|---|
| `shares-view` | Find the writer who has the same opinion as a named writer on a given point. |
| `differs-from-one` | Find the writer who has a different opinion from a named writer on a given point. |
| `differs-from-all` | Find the writer whose opinion on a given point differs from all the others. |

**Part 7 – Gapped text** (6 gaps, removed paragraphs, SPEC §4; 7 paragraphs with 1 extra, ARCHITECTURE §5.3) – 5 tags
| Tag | Definition |
|---|---|
| `reference-link` | The key clue is a pronoun or demonstrative (*this, they, such*) that points back or forward across the gap. |
| `lexical-link` | The key clue is a repeated word, a synonym or a word from the same topic on both sides of the gap. |
| `discourse-marker` | The key clue is a linker at the start of a paragraph or after the gap (*However, As a result, Even so*). |
| `chronology` | The key clue is the order of events or time references (*later, by then, two years on*). |
| `argument-flow` | The key clue is the logic of the argument: claim then example, problem then solution, view then counter-view. |

**Part 8 – Multiple matching** (10 Q, SPEC §4) – 4 tags
| Tag | Definition |
|---|---|
| `specific-detail` | Match a stated fact, event or detail, expressed in different words in the text. |
| `opinion-attitude` | Match an opinion, attitude or judgement held by the writer or person in the section. |
| `reason-purpose` | Match the reason for an action or the purpose behind it. |
| `feeling-experience` | Match how someone felt or what they experienced. |

### 2.2 Listening

**Part 1 – Three short extracts** (2 Q each, A-C, SPEC §4, §7) – 6 tags
| Tag | Definition |
|---|---|
| `gist` | The answer is the main topic or point of the extract. |
| `detail` | The answer is a specific point a speaker states. |
| `attitude-opinion` | The answer is a speaker's opinion or attitude towards something. |
| `feeling` | The answer is how a speaker feels (e.g. relieved, frustrated). |
| `speaker-agreement` | The answer is what both speakers agree or disagree about. |
| `purpose-function` | The answer is why a speaker says something (to complain, to persuade, to warn). |

**Part 2 – Sentence completion** (monologue, 8 Q, SPEC §4; 1-3 words, ARCHITECTURE §5.4) – 4 tags
| Tag | Definition |
|---|---|
| `specific-detail` | The answer is a word or short phrase heard in the recording that completes the sentence. |
| `number-quantity` | The answer is a number, date, price or quantity. |
| `self-correction` | The speaker first mentions a wrong item and then corrects it; the answer is the corrected item. |
| `word-form` | The words are heard, but the correct form must fit the sentence (singular/plural, word class). |

**Part 3 – Multiple choice on a conversation** (6 Q, A-D, SPEC §4, §7) – 6 tags
| Tag | Definition |
|---|---|
| `detail` | The answer is a specific point a speaker states. |
| `gist` | The answer is the main point of a section of the conversation. |
| `attitude-opinion` | The answer is a speaker's opinion or attitude. |
| `speaker-agreement` | The answer is what the speakers agree or disagree about. |
| `inference` | The answer is implied, not stated directly. |
| `meaning-in-context` | The answer is what a speaker means by a phrase they use. |

**Part 4 – Multiple matching, five speakers** (2 tasks, 8 options each, SPEC §4, §7) – 5 tags
One tag per task (all 5 answers of a task share it). Note for dev: ARCHITECTURE §5.4 has no `type` field on Listening 4 tasks yet; add `task1.type` and `task2.type`.
| Tag | Definition |
|---|---|
| `reason-motivation` | The task asks why each speaker did something. |
| `feeling-attitude` | The task asks how each speaker felt or what they think about something. |
| `experience-event` | The task asks what happened to each speaker or what they experienced. |
| `advice-recommendation` | The task asks what each speaker recommends or would advise. |
| `gist` | The task asks about each speaker's main point or topic. |

Totals: R&UoE 7 / 11 / 6 / 13 / 7 / 3 / 5 / 4 tags; Listening 6 / 4 / 6 / 5 tags.

## 3. Explanation style (ARCHITECTURE §5.1, assumption A6)
- Every auto-scored question has `explanation.en` and `explanation.cs`, each 1-3 sentences.
- **EN** says why the key is correct and points to the clue in the text (quote 2-6 words of our own text). For MC and matching, also say why the most tempting wrong option is wrong.
- **CZ** is not a word-for-word translation. It explains the rule or trap in plain Czech and may give the Czech equivalent. Keep English examples in English.
- Plain text only: no HTML, no `<` or `>`, no Markdown (ARCHITECTURE §5.5).
- No "always/never" grammar claims unless they are true. Prefer "usually" where English allows exceptions.
- Example (Part 1, `dependent-preposition`):
  - en: "*Capable* is followed by *of* + -ing ('capable of running'). *Able* needs *to* + infinitive, so B does not fit before 'of'."
  - cs: "Po *capable* následuje *of* + -ing. *Able* se pojí s *to* + infinitiv, proto B nesedí."

## 4. Distractor rules per part
General: every wrong option must be wrong for a reason you can state in one sentence, and that reason goes in the explanation. There must be only one defensible answer. If a reviewer can argue for a second option, rewrite the item.

- **Part 1:** 4 distinct options A-D (SPEC §7), same word class and form, so grammar alone does not eliminate them. Distractors are near-synonyms that fail on collocation, preposition, pattern or exact meaning. Do not use a distractor that would also be correct in a different but natural reading.
- **Part 2:** no options. Check that only one word (or a small listed set) fits. List every valid alternative in `answers` (SPEC §7: exactly one word per gap). Avoid gaps that only a content word could fill; the part tests mainly grammar and fixed phrases (app convention).
- **Part 3:** the stem appears in capitals at the end of the line, and the answer is always a different form of it (ARCHITECTURE §5.3). Use at least 2 gaps per text that need a prefix or two changes (e.g. *un-...-able*). List alternative spellings only if both are standard (*-ise/-ize*).
- **Part 4:** no distractors. See section 5 for keys.
- **Part 5:** 4 options (SPEC §4). Each distractor uses words that appear in the text but either misstates what it says, is true but does not answer the question, or goes beyond the text. Options are similar in length. The key should not repeat the text's wording, while distractors may.
- **Part 6:** each of the 4 texts gives an opinion on the same 3-4 sub-topics. A wrong text must mention the sub-topic but with a different or unclear stance, not ignore it.
- **Part 7:** the extra paragraph is on topic and shares vocabulary with the text, but fails on reference or logic in every gap. Each correct paragraph must have at least 2 clues (one before the gap, one after).
- **Part 8:** each wrong section mentions something close to the question topic (the same place, person or theme) but does not express the specific point. Paraphrase the text in the question; do not repeat it word for word.
- **Listening 1 and 3:** 3 or 4 options respectively (SPEC §7). Every option is mentioned or hinted at in the script; distractors are rejected, contradicted or said by the other speaker.
- **Listening 2:** the script mentions 1-2 other plausible words near each answer (a rejected item, a related item). The answer words are heard in the script, as the task requires (app convention for TTS).
- **Listening 4:** 8 options per task, 5 used (SPEC §4). The 3 unused options each match something a speaker says in passing but is not their main point.

## 5. Key word transformations: two marked parts (SPEC §4, US2; ARCHITECTURE §5.3)
Official facts: 3-6 words including the key word, which must not be changed; up to 2 marks per item (SPEC §4, §7). The split into exactly two marked chunks follows SPEC US2. Where the two chunks fall in each item is our design (app convention).

How to write the key:
1. Write `sentence1`, `keyWord` (uppercase), `before` and `after`. The gap must need 3-6 words.
2. Find the **two separate changes** the rewrite needs. Usually: (a) the structure built around the key word, and (b) a second change of grammar or vocabulary (tense, preposition, object, a noun replacing a verb).
3. `parts[0]` and `parts[1]` each hold the accepted strings for one change. Each string is a contiguous run of words in the full answer. The two parts must not overlap.
4. The key word belongs to exactly one part. A part made only of the key word does not earn a mark by itself (the key word is given). Put it together with the words that make the structure.
5. `fullAnswers` lists every complete answer we accept (3-6 words, contains the key word unchanged, contains one variant of each part). Add natural alternatives (*he'd / he had*, *in spite of / despite*).
6. The explanation names both parts: "Part 1: ... Part 2: ...".

Example (`nominalisation`):
- sentence1: "They decided to postpone the meeting quite suddenly."
- keyWord: DECISION; before: "They made"; after: "the meeting."
- parts: [{accepted: ["a sudden decision"]}, {accepted: ["to postpone", "to put off"]}]
- fullAnswers: ["a sudden decision to postpone", "a sudden decision to put off"]
- Part 1 = *made a sudden decision* (adjective replaces the adverb). Part 2 = *decision to* + infinitive.

Note: the ARCHITECTURE §5.3 example puts the key word alone in `parts[0]` (`["unless"]`). Under rule 4 that item should be written as parts `["unless you"]` / `["promise"]`, or as a different split. Fix it when the sample file is written in T03.

## 6. Assumption A7 – decision
**Decision: confirmed as a practice-app convention (keep it on). Not verified as an official Cambridge rule.**
- Official (SPEC §4, §7): the answer is 3-6 words including the key word.
- Not found in an official source (searched 2026-11-23): (a) that an answer over 6 words scores 0, and (b) that contractions count as 2 words for Part 4.
  - The Cambridge "C1 Advanced teaching tips" PDF (https://www.cambridgeenglish.org/Images/167863-c1-advanced-teaching-tips.pdf) appeared in search results with a note that contractions count as two words. We could not open the PDF to confirm the wording or which part it applies to.
  - Third-party practice sites (e.g. esl-lounge.com, KWT answer keys, read 2026-11-23) state both rules for Part 4. They are not Cambridge sources.
- Why we keep it: it trains the owner to keep within the stated limit, which is the safe habit in the exam. The cost of a false 0 is low, because review shows `fullAnswers` and offers self-marking (ARCHITECTURE §7.2).
- UI and explanations must call it "pravidlo této aplikace" (app rule), not an official Cambridge rule.
- ARCHITECTURE §12 A7 needs no change. The constant stays on.

## 7. Label wording
Allowed (ARCHITECTURE §7.7, SPEC §7):
- Badge for `ai-generated`: "AI-generated practice in the C1 Advanced format". Czech: "Cvičení vytvořené AI ve formátu C1 Advanced".
- Badge for `official-format-reference`: "Official format reference", always with the source URL and the date read.
- Footer notice: "Not official Cambridge material". Czech: "Nejde o oficiální materiál Cambridge".
- Scores: "practice score x/y" or "%". Any future estimate must say "rough unofficial estimate" (SPEC §7).
- Phrases you may use: "practice in the C1 Advanced format", "modelled on the C1 Advanced format", "exam-style".

Forbidden in any `ai-generated` set and in UI text about AI items (SPEC §7):
- "official", "official test", "official Cambridge question", "official exam"
- "real exam", "real test", "actual exam question"
- "authentic", "authentic exam"
- "past paper", "Cambridge-approved", "endorsed by Cambridge"
- Any Cambridge English Scale score or grade for a practice result (SPEC §7).

For `content.test.ts` (T04): ARCHITECTURE §5.5 checks "official Cambridge question", "real exam" and "authentic exam" in all strings. Suggested addition: also reject "official", "authentic" and "past paper" in `title`, `topic` and label fields only. Exam texts may use these words naturally (e.g. "an authentic recipe"), so do not ban them in `text`.

## 8. Reviewer checklist (per set)
- Format matches SPEC §4 and §7 (counts, options, word limits).
- Exactly one defensible key; alternatives listed for open answers.
- One tag from section 2 per question.
- EN and CZ explanations of 1-3 sentences, with the clue named.
- `label: ai-generated`, no forbidden wording, original text not taken from Cambridge material.
- Set `reviewed: true` only after this check.
