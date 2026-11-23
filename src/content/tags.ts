// Controlled question-type vocabulary. Source of truth: docs/CONTENT_GUIDE.md section 2.
// Stats group by (paper, part, type), so free-text tags are rejected by the schema.
export const RUE_TAGS = {
  1: ['collocation', 'fixed-phrase', 'phrasal-verb', 'linking', 'meaning-in-context', 'dependent-preposition', 'verb-pattern'],
  2: ['article-determiner', 'preposition', 'pronoun', 'relative-pronoun', 'auxiliary-verb', 'linking', 'quantifier', 'comparison', 'phrasal-verb', 'fixed-phrase', 'inversion'],
  3: ['noun-formation', 'adjective-formation', 'adverb-formation', 'verb-formation', 'negative-prefix', 'compound-word'],
  4: ['conditional', 'passive', 'reported-speech', 'modal-verb', 'comparison', 'inversion', 'wish-regret', 'causative', 'verb-pattern', 'phrasal-verb', 'fixed-phrase', 'linking', 'nominalisation'],
  5: ['detail', 'gist', 'attitude-opinion', 'inference', 'purpose-function', 'reference', 'meaning-in-context'],
  6: ['shares-view', 'differs-from-one', 'differs-from-all'],
  7: ['reference-link', 'lexical-link', 'discourse-marker', 'chronology', 'argument-flow'],
  8: ['specific-detail', 'opinion-attitude', 'reason-purpose', 'feeling-experience'],
} as const;

export const LISTENING_TAGS = {
  1: ['gist', 'detail', 'attitude-opinion', 'feeling', 'speaker-agreement', 'purpose-function'],
  2: ['specific-detail', 'number-quantity', 'self-correction', 'word-form'],
  3: ['detail', 'gist', 'attitude-opinion', 'speaker-agreement', 'inference', 'meaning-in-context'],
  4: ['reason-motivation', 'feeling-attitude', 'experience-event', 'advice-recommendation', 'gist'],
} as const;
