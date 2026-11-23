import { setById } from '../content/loader';
import { buildAttempts, isGapSet, newSession, parseGapText, recomputeSession, scoreGap } from '../domain/drill';
import type { Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { PARTS } from './home';

const notFound = (): ReturnType<Route['render']> => ({
  title: 'Nenalezeno',
  content: h('div', { class: 'stack' }, h('h1', {}, 'Sada nenalezena'), h('a', { href: '#/' }, 'Zpět na části')),
});

export function drillScreen(store: Store, setId: string): ReturnType<Route['render']> {
  const set = setById(setId);
  if (!set || !isGapSet(set)) return notFound();

  const controls = new Map<number, HTMLSelectElement | HTMLInputElement>();
  const gaps = new Map<number, HTMLElement>();

  const gapEl = (n: number): HTMLElement => {
    const q = set.questions.find((x) => x.n === n);
    const wrap = h('span', { class: 'gap' }, h('span', { class: 'gap__num', 'aria-hidden': 'true' }, n));
    if (!q) return wrap;
    let ctl: HTMLSelectElement | HTMLInputElement;
    if ('options' in q) {
      ctl = h(
        'select',
        { class: 'gap__input', 'aria-label': `Gap ${n}` },
        h('option', { value: '' }, '–'),
        Object.entries(q.options).map(([k, v]) => h('option', { value: k }, `${k}  ${v}`)),
      );
    } else {
      const stem = 'stem' in q ? q.stem : null;
      ctl = h('input', {
        class: 'gap__input',
        type: 'text',
        autocomplete: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        'aria-label': stem ? `Gap ${n}, word to form from ${stem}` : `Gap ${n}`,
      });
      if (stem) wrap.append(ctl, h('span', { class: 'gap__stem' }, stem));
    }
    controls.set(n, ctl);
    gaps.set(n, wrap);
    if (!wrap.contains(ctl)) wrap.append(ctl);
    return wrap;
  };

  const paragraphs = parseGapText(set.text).map((segs) =>
    h('p', {}, segs.map((s) => (s.t === 'text' ? s.value : gapEl(s.n)))),
  );

  const score = h('p', { class: 'score', 'aria-live': 'polite' });
  const actions = h('div', { class: 'drill__actions' });
  const submit = h('button', { class: 'btn', type: 'submit' }, 'Zkontrolovat odpovědi');
  actions.append(submit);

  const onSubmit = (e: Event): void => {
    e.preventDefault();
    const now = new Date().toISOString();
    const sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const answers: Record<number, string> = {};
    controls.forEach((c, n) => (answers[n] = c.value));
    const attempts = buildAttempts(set, answers, sid, now);
    const session = recomputeSession(newSession(set, sid, now), attempts);
    store.update((d) => {
      d.sessions.push(session);
      d.attempts.push(...attempts);
    });
    set.questions.forEach((q) => {
      const ok = scoreGap(q, answers[q.n] ?? '') === 1;
      gaps.get(q.n)?.classList.add(ok ? 'is-correct' : 'is-incorrect');
      const c = controls.get(q.n);
      if (c) c.disabled = true;
    });
    submit.disabled = true;
    score.textContent = `Skóre: ${session.marks}/${session.maxMarks}`;
    actions.append(h('a', { class: 'btn', href: `#/review/${sid}` }, 'Zobrazit vysvětlení'));
  };

  return {
    title: set.title,
    content: h(
      'div',
      { class: 'stack' },
      h('h1', {}, `Part ${set.part} – ${set.title}`),
      h('p', {}, labelBadge(set.label), ' ', h('span', { class: 'muted' }, PARTS[set.part])),
      h('form', { class: 'drill', onsubmit: onSubmit }, h('div', { class: 'gap-text', lang: 'en' }, paragraphs), actions, score),
      h('a', { href: `#/part/${set.part}` }, 'Zpět na sady'),
    ),
  };
}
