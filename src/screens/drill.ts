import { kwtWordCount } from '../content/schema';
import { setById } from '../content/loader';
import { maxMarks, type KwtItem } from '../domain/scoring';
import { blocksImplicitSubmit, buildAttempts, isDrillSet, newSession, parseGapText, questionsOf, recomputeSession, scoreAny, type DrillSet, type Embedded, type ReadingSet } from '../domain/drill';
import type { Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { correctShort } from '../domain/progress';
import { PARTS } from './home';

const notFound = (): ReturnType<Route['render']> => ({
  title: 'Nenalezeno',
  content: h('div', { class: 'stack' }, h('h1', {}, 'Sada nenalezena'), h('a', { href: '#/' }, 'Zpět na části')),
});

function saveDrill(store: Store, set: DrillSet, answers: Record<number, string>, sid: string, now: string, retry?: ReadonlySet<number>) {
  const attempts = buildAttempts(set, answers, sid, now, retry);
  const session = recomputeSession(newSession(set, sid, now, retry ? 'retry' : 'drill'), attempts);
  store.update((d) => {
    d.sessions.push(session);
    d.attempts.push(...attempts);
  });
  return { session, attempts };
}

/** `retry`: question numbers to answer again; other gaps are read-only with the correct answer. `embed`: the host page (mini mock) submits; no own buttons or saving. */
export function drillScreen(store: Store, setId: string, retry?: ReadonlySet<number>, embed?: (e: Embedded) => void): ReturnType<Route['render']> {
  const found = setById(setId);
  if (!found) return notFound();
  const set: DrillSet = found;

  const ds = set;
  const controls = new Map<number, { value: string; disabled: boolean }>();
  const gaps = new Map<number, HTMLElement>();

  const dupNote = h('p', { class: 'notice', role: 'status' });
  /** Part 7: duplicates are allowed (each paragraph is used once in the real exam) but flagged. */
  function flagDuplicates(): void {
    const by = new Map<string, number[]>();
    // read-only gaps (retry) already use their paragraph
    if (ds.part === 7) ds.questions.filter((q) => !active(q.n)).forEach((q) => by.set(q.answer, [...(by.get(q.answer) ?? []), q.n]));
    controls.forEach((c, n) => c.value && by.set(c.value, [...(by.get(c.value) ?? []), n]));
    const dups = [...by].filter(([, ns]) => ns.length > 1);
    dupNote.textContent = dups.map(([k, ns]) => `Odstavec ${k} je vybrán vícekrát (mezery ${ns.join(', ')}).`).join(' ');
    dupNote.hidden = !dups.length;
    controls.forEach((c, n) => gaps.get(n)?.classList.toggle('is-duplicate', !!c.value && (by.get(c.value)?.length ?? 0) > 1));
  }
  dupNote.hidden = true;

  const active = (n: number): boolean => !retry || retry.has(n);
  const kwtItems = set.part === 4 ? set.items.filter((i) => active(i.n)).map(kwtEl) : [];

  const paras = (t: string): HTMLElement[] => t.split(/\n\n+/).map((x) => x.trim()).filter(Boolean).map((x) => h('p', {}, x));

  /** Parts 5, 6, 8: one question per list item; Part 5 uses radios, Parts 6 and 8 a select. */
  function readingQ(q: ReadingSet['questions'][number]): HTMLElement {
    const li = h('li', { class: 'q' });
    gaps.set(q.n, li);
    const stem = h('span', { lang: 'en' }, h('span', { class: 'gap__num', 'aria-hidden': 'true' }, q.n), ' ', q.stem);
    if (!active(q.n)) {
      li.append(h('p', {}, stem), h('p', {}, h('span', { class: 'gap__fixed', lang: 'en' }, correctShort(set, q)), h('span', { class: 'visually-hidden', lang: 'cs' }, ' (již správně, jen ke čtení)')));
      return li;
    }
    if ('options' in q) {
      let value = '';
      const radios = Object.entries(q.options).map(([k, v]) =>
        h('label', { class: 'q__option', lang: 'en' }, h('input', { type: 'radio', name: `q${q.n}`, value: k, onchange: () => (value = k) }), ` ${k}  ${v}`),
      );
      const group = h('fieldset', { class: 'q__group' }, h('legend', {}, stem), radios);
      controls.set(q.n, {
        get value() { return value; },
        set disabled(d: boolean) { group.disabled = d; },
      } as { value: string; disabled: boolean });
      li.append(group);
      return li;
    }
    const pool: { id: string; heading: string }[] = set.part === 6 ? set.texts : set.part === 8 ? set.sections : [];
    const sel = h(
      'select',
      { class: 'q__select', id: `q${q.n}` },
      h('option', { value: '' }, '–'),
      pool.map((x) => h('option', { value: x.id }, set.part === 8 ? `${x.id}  ${x.heading}` : x.id)),
    );
    controls.set(q.n, sel);
    li.append(h('label', { for: `q${q.n}`, class: 'q__stem' }, stem), sel);
    return li;
  }

  function readingBody(rs: ReadingSet): HTMLElement {
    const passages = rs.part === 5
      ? paras(rs.text)
      : (rs.part === 6 ? rs.texts : rs.sections).map((x) =>
          h('section', { class: 'passage' }, h('h2', {}, `${rs.part === 6 ? 'Text' : 'Section'} ${x.id} – ${x.heading}`), paras(x.text)));
    return h(
      'div',
      { class: 'split' },
      h('div', { class: 'passages stack', lang: 'en' }, passages),
      h('ol', { class: 'q-list stack' }, (rs.questions as ReadingSet['questions']).map(readingQ)),
    );
  }

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
    if (!active(n)) {
      wrap.append(h('span', { class: 'gap__fixed' }, correctShort(set, q)), h('span', { class: 'visually-hidden', lang: 'cs' }, ' (již správně, jen ke čtení)'));
      return wrap;
    }
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

  const paragraphs = set.part === 4 || set.part === 5 || set.part === 6 || set.part === 8 ? [] : parseGapText(set.text).map((segs) =>
    h('p', {}, segs.map((s) => (s.t === 'text' ? s.value : gapEl(s.n)))),
  );

  const score = h('p', { class: 'score', 'aria-live': 'polite', tabindex: '-1' });
  const actions = h('div', { class: 'drill__actions' });
  const submit = h('button', { class: 'btn', type: 'submit' }, 'Zkontrolovat odpovědi');
  actions.append(submit);

  const onSubmit = (e: Event): void => {
    e.preventDefault();
    if (embed) return;
    const now = new Date().toISOString();
    const sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const answers: Record<number, string> = {};
    controls.forEach((c, n) => (answers[n] = c.value));
    const { session } = saveDrill(store, set, answers, sid, now, retry);
    questionsOf(set).filter((q) => active(q.n)).forEach((q) => {
      const ok = scoreAny(set, q, answers[q.n] ?? '') === maxMarks(set.part);
      gaps.get(q.n)?.classList.add(ok ? 'is-correct' : 'is-incorrect');
      const c = controls.get(q.n);
      if (c) c.disabled = true;
    });
    submit.disabled = true;
    score.textContent = `Skóre: ${session.marks}/${session.maxMarks}`;
    actions.append(h('a', { class: 'btn', href: `#/review/${sid}` }, 'Zobrazit vysvětlení'));
    score.focus();
  };

  embed?.({
    answers: () => Object.fromEntries([...controls].map(([n, c]) => [n, c.value])),
    lock: () => controls.forEach((c) => (c.disabled = true)),
  });

  return {
    title: set.title,
    content: h(
      embed ? 'section' : 'div',
      { class: 'stack' },
      h(embed ? 'h2' : 'h1', {}, `${retry ? 'Opakování chyb: ' : ''}`, h('span', { lang: 'en' }, `Part ${set.part} – ${set.title}`)),
      h('p', {}, labelBadge(set.label), ' ', h('span', { class: 'muted', lang: 'en' }, PARTS[set.part])),
      h('form', { class: 'drill', onsubmit: onSubmit, onkeydown: (e: Event) => {
        const t = e.target as HTMLInputElement;
        if (blocksImplicitSubmit((e as KeyboardEvent).key, t.tagName, t.type)) e.preventDefault();
      } }, set.part === 4
          ? h('ol', { class: 'kwt-list stack' }, kwtItems)
          : set.part === 5 || set.part === 6 || set.part === 8
          ? readingBody(set)
          : h('div', { class: 'gap-text', lang: 'en' }, paragraphs),
        set.part === 7
          ? h('div', { class: 'stack' }, dupNote, h('h2', {}, 'Odstavce'), h('dl', { class: 'para-list', lang: 'en' }, set.paragraphs.flatMap((p) => [h('dt', {}, p.id), h('dd', {}, p.text)])))
          : null,
        embed ? null : actions,
        embed ? null : score),
      embed ? null : h('a', { href: retry ? '#/retry' : `#/part/${set.part}` }, retry ? 'Zpět na opakování' : 'Zpět na sady'),
    ),
  };
}
