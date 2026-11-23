import { expect, test } from 'vitest';

const SINKS = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function\b/;

// Source text of every .ts file in src/ (no node typings needed).
const sources = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

test('the sink pattern detects each forbidden API', () => {
  for (const bad of ['a.innerHTML = x', 'a.outerHTML', 'a.insertAdjacentHTML()', 'document.write(1)', 'eval(x)', 'new Function("x")'])
    expect(SINKS.test(bad), bad).toBe(true);
});

test('no HTML sinks in src/', () => {
  expect(Object.keys(sources).length).toBeGreaterThan(5);
  expect(Object.entries(sources).filter(([, text]) => SINKS.test(text)).map(([f]) => f)).toEqual([]);
});
