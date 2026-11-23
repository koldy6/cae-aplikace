import { kwtWordCount } from '../content/schema';
import { setById } from '../content/loader';
import { maxMarks, type KwtItem } from '../domain/scoring';
import { buildAttempts, isDrillSet, newSession, parseGapText, questionsOf, recomputeSession, scoreAny, type DrillSet } from '../domain/drill';
import type { Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { PARTS } from './home';

const notFound = (): ReturnType<Route['render']> => ({
  title: 'Nenalezeno',
  content: h('div', { class: 'stack' }, h('h1', {}, 'Sada nenalezena'), h('a', { href: '#/' }, 'Zpět na části')),
});

function saveDrill(store: Store, set: DrillSet, answers: Record<number, string>, sid: string, now: string) {
  const attempts = buildAttempts(set, answers, sid, now);
  const session = recomputeSession(newSession(set, sid, now), attempts);
  store.update((d) => {
    d.sessions.push(session);
    d.attempts.push(...attempts);
  });
  return { session, attempts };
}

export function drillScreen(store: Store, setId: string): ReturnType<Route['render']> {
  const set = setById(setId);
  if (!set || !isDrillSet(set)) return notFound();

  const controls = new Map<number, HTMLSelectElement | HTMLInputElement>();
  const gaps = new Map<number, HTMLElement>();

  const dupNote = h('p', { class: 'notice', role: 'status' });
  /** Part 7: duplicates are allowed (each paragraph is used once in the real exam) but flagged. */
  function flagDuplicates(): void {
    const by = new Map<string, number[]>();
    controls.forEach((c, n) => c.value && by.set(c.value, [...(by.get(c.value) ?? []), n]));
    const dups = [...by].filter(([, ns]) => ns.length > 1);
    dupNote.textContent = dups.map(([k, ns]) => `Odstavec ${k} je vybrán vícekrát (mezery ${ns.join(', ')}).`).join(' ');
    dupNote.hidden = !dups.length;
    controls.forEach((c, n) => gaps.get(n)?.classList.toggle('is-duplicate', !!c.value && (by.get(c.value)?.length ?? 0) > 1));
  }
  dupNote.hidden = true;

  const kwtItems = set.part === 4 ? set.items.map(kwtEl) : [];

  function kwtEl(it: KwtItem): HTMLElement {
    const hint = h('span', { class: 'kwt__hint muted', id: `kwt-hint-${it.n}` });
    const input = h('input', {
      class: 'input kwt__input',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      lang: 'en',
      'aria-label': `Item ${it.n}: ${it.before} ... ${it.after}. Use 3 to 6 words including ${it.keyWord}`,
      'aria-describedby': hint.id,
    });
    const count = (): void => {
      const n = kwtWordCount(input.value);
      hint.textContent = `Slov: ${n} (povoleno 3–6; zkrácený tvar jako don't se počítá jako 2 slova – pravidlo této aplikace)`;
    };
    input.addEventListener('input', count);
    count();
    controls.set(it.n, input);
    const li = h(
      'li',
      { class: 'kwt', lang: 'en' },
      h('p', {}, h('span', { class: 'gap__num', 'aria-hidden': 'true' }, it.n), it.sentence1),
      h('p', {}, 'Key word: ', h('strong', { class: 'kwt__key' }, it.keyWord)),
      h('p', { class: 'kwt__line' }, it.before, ' ', input, ' ', it.after),
      h('p', { lang: 'cs' }, hint),
    );
    gaps.set(it.n, li);
    return li;
  }

  const gapEl = (n: number): HTMLElement => {
    const q = questionsOf(set).find((x) => x.n === n);
    const wrap = h('span', { class: 'gap' }, h('span', { class: 'gap__num', 'aria-hidden': 'true' }, n));
    if (!q) return wrap;
    let ctl: HTMLSelectElement | HTMLInputElement;
    if (set.part === 7) {
      ctl = h(
        'select',
        { class: 'gap__input', 'aria-label': `Gap ${n}`, onchange: flagDuplicates },
        h('option', { value: '' }, '–'),
        'ABCDEFG'.split('').map((k) => h('option', { value: k }, k)),
      );
    } else if ('options' in q) {
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

  const paragraphs = set.part === 4 ? [] : parseGapText(set.text).map((segs) =>
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
    const { session } = saveDrill(store, set, answers, sid, now);
    questionsOf(set).forEach((q) => {
      const ok = scoreAny(set, q, answers[q.n] ?? '') === maxMarks(set.part);
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
      h('form', { class: 'drill', onsubmit: onSubmit }, set.part === 4
          ? h('ol', { class: 'kwt-list stack' }, kwtItems)
          : h('div', { class: 'gap-text', lang: 'en' }, paragraphs),
        set.part === 7
          ? h('div', { class: 'stack' }, dupNote, h('h2', {}, 'Odstavce'), h('dl', { class: 'para-list', lang: 'en' }, set.paragraphs.flatMap((p) => [h('dt', {}, p.id), h('dd', {}, p.text)])))
          : null,
        actions,
        score),
      h('a', { href: `#/part/${set.part}` }, 'Zpět na sady'),
    ),
  };
}
