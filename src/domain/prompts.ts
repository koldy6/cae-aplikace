import type { FormatReference, WritingTask } from '../content/types';

/** Words = whitespace-separated tokens (hyphenated words and contractions count as one). */
export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

export type WordState = 'short' | 'ok' | 'long' | 'empty';
export const wordState = (n: number, min: number, max: number): WordState => (n === 0 ? 'empty' : n < min ? 'short' : n > max ? 'long' : 'ok');

/** Prompt for claude.ai. English for the model; asks for a Czech summary. */
export function buildWritingPrompt(task: WritingTask, text: string, reference: FormatReference): string {
  const criteria = reference.writingCriteria.map((c, i) => `${i + 1}. ${c.name}: ${c.descriptionEn}`);
  const lines = [
    'You are an experienced Cambridge C1 Advanced (CAE) Writing examiner and teacher.',
    `Give feedback on the candidate's answer to the task below. ${reference.notice.en}`,
    '',
    `TASK (Writing Part ${task.part}, ${task.taskType}, ${task.wordMin}-${task.wordMax} words):`,
    task.instructions,
  ];
  if (task.inputText) lines.push('', 'INPUT TEXT:', task.inputText);
  if (task.points.length) lines.push('', 'POINTS TO COVER:', ...task.points.map((p) => `- ${p}`));
  lines.push(
    '',
    `CANDIDATE'S ANSWER (${wordCount(text)} words):`,
    text,
    '',
    'Please reply with:',
    '1. Feedback on each of the 4 criteria below, with a short comment and an approximate band (0-5):',
    ...criteria.map((c) => `   ${c}`),
    '2. Up to 5 key sentences from the answer, each corrected or improved, with a one-line reason.',
    '3. A short summary of the main strengths and the top 3 things to improve, written in Czech.',
    '',
    reference.notice.en,
  );
  return lines.join('\n');
}
