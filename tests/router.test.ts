import { describe, expect, it } from 'vitest';
import { routeParams } from '../src/ui/router';

// Same pattern as the review route in main.ts.
const review = /^\/review\/([\w-]+)(?:\/([\w-]+))?$/;

describe('routeParams', () => {
  it('keeps an unmatched optional group undefined (regression: review showed "Výsledek nenalezen")', () => {
    expect(routeParams(review.exec('/review/s-abc')!)).toEqual(['s-abc', undefined]);
  });

  it('decodes matched groups', () => {
    expect(routeParams(review.exec('/review/s-abc/rue1-001')!)).toEqual(['s-abc', 'rue1-001']);
    expect(routeParams(/^\/x\/(.+)$/.exec('/x/a%20b')!)).toEqual(['a b']);
  });
});
