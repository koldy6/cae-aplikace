import type { ListeningSet } from '../content/types';
import { blocksImplicitSubmit, newSession, recomputeSession, type Embedded } from '../domain/drill';
import { buildListeningAttempts, listeningQuestions, playUnits, scoreListening, scriptGroups, speakerLabel, type LQ } from '../domain/listening';
import { browserEnv, createPlayer, isSupported, type Player, type Segment, type TtsError } from '../media/tts';
import type { Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { LISTENING_PARTS, RATES } from './home';

/** The script as text: fallback without speech, and revealed after submit. */
export function scriptView(set: ListeningSet): HTMLElement {
  return h('section', { class: 'script stack', lang: 'en' },
    h('h2', { lang: 'cs' }, 'Přepis nahrávky'),
    scriptGroups(set).map((g) =>
      h('div', {}, h('h3', {}, g.title), g.segments.map((s) => h('p', {}, h('strong', {}, `${speakerLabel(s.speaker)}: `), s.text)))),
  );
}

const ERRORS: Record<TtsError, string> = {
  unsupported: 'Tento prohlížeč nepodporuje čtení textu nahlas. Přepis nahrávky je níže, přečti si ho.',
  'no-voices': 'Prohlížeč nemá žádný anglický hlas. Přepis nahrávky je níže, přečti si ho.',
  limit: 'Limit přehrání je vyčerpán.',
  speech: 'Přehrávání selhalo. Zkus to znovu nebo si přečti přepis.',
};

/** `retry`: question numbers to answer again; the others are shown read-only with the correct answer. */
export function listeningDrillScreen(store: Store, set: ListeningSet, retry?: ReadonlySet<number>, embed?: (e: Embedded) => void): ReturnType<Route['render']> {
  const settings = store.get().settings;
  const qs = listeningQuestions(set);
  const q = (n: number): LQ => qs.find((x) => x.n === n)!;
  const active = (n: number): boolean => !retry || retry.has(n);
  const controls = new Map<number, { value: string; disabled: boolean }>();
  const items = new Map<number, HTMLElement>();
  const supported = isSupported(browserEnv());
  const script = scriptView(set);
  script.hidden = supported; // shown at once when speech does not work, otherwise only after submit
  const msg = h('p', { class: 'notice', role: 'status', hidden: true });
  const showError = (c: TtsError): void => {
    msg.textContent = ERRORS[c];
    msg.hidden = false;
    if (c === 'unsupported' || c === 'no-voices') script.hidden = false;
  };

  // ---- players: one per audio unit (own play counter), only one speaks at a time ----
  const bars: { player: Player; refresh: () => void }[] = [];
  const rateSel = h('select', { class: 'input', id: 'rate', onchange: () => {
    const r = Number(rateSel.value);
    store.update((d) => { d.settings.ttsRate = r; });
    bars.forEach((b) => b.player.setRate(r));
  } }, RATES.map((r) => h('option', { value: r }, `${r}×`)));
  rateSel.value = String(RATES.includes(settings.ttsRate) ? settings.ttsRate : 1);

  function playerBar(unit: { title: string; segments: Segment[] }): HTMLElement {
    let paused = false;
    const status = h('span', { class: 'muted', role: 'status' });
    const player = createPlayer({
      limit: settings.listeningPlayLimit, rate: Number(rateSel.value), voiceA: settings.ttsVoiceA, voiceB: settings.ttsVoiceB,
      events: { onEnd: () => { paused = false; refresh(); }, onError: (c) => { showError(c); paused = false; refresh(); } },
    });
    const play = h('button', { class: 'btn', type: 'button', onclick: () => {
      msg.hidden = true;
      bars.forEach((b) => b !== me && b.player.isPlaying() && (b.player.stop(), b.refresh()));
      paused = false;
      player.play(unit.segments);
      refresh();
    } }, 'Přehrát');
    const pause = h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => {
      paused = !paused;
      if (paused) player.pause(); else player.resume();
      refresh();
    } });
    const stop = h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => { player.stop(); paused = false; refresh(); } }, 'Zastavit');
    function refresh(): void {
      const playing = player.isPlaying();
      status.textContent = player.counter.limit === null ? `Přehrání: ${player.counter.used} (neomezeně)` : `Přehrání: ${player.counter.used}/${player.counter.limit}`;
      play.disabled = playing || !player.supported || !player.counter.canPlay();
      pause.textContent = paused ? 'Pokračovat' : 'Pozastavit';
      pause.disabled = stop.disabled = !playing;
    }
    const me = { player, refresh };
    bars.push(me);
    void player.init();
    refresh();
    return h('div', { class: 'player', role: 'group', 'aria-label': `Přehrávač: ${unit.title}` }, h('strong', { lang: 'en' }, unit.title), play, pause, stop, status);
  }
  const stopAll = (): void => bars.forEach((b) => b.player.stop());
  window.addEventListener('hashchange', stopAll, { once: true });
  window.addEventListener('pagehide', stopAll, { once: true });

  // ---- questions ----
  const fixed = (x: LQ): HTMLElement =>
    h('span', { class: 'gap__fixed', lang: 'en' }, x.options ? x.options[x.keys[0]!] : x.keys[0], h('span', { class: 'visually-hidden', lang: 'cs' }, ' (již správně, jen ke čtení)'));

  function radioQ(n: number, stem: string): HTMLElement {
    const x = q(n);
    const li = h('li', { class: 'q' });
    items.set(n, li);
    const head = h('span', { lang: 'en' }, h('span', { class: 'gap__num', 'aria-hidden': 'true' }, n), ' ', stem);
    if (!active(n)) { li.append(h('p', {}, head), h('p', {}, fixed(x))); return li; }
    let value = '';
    const group = h('fieldset', { class: 'q__group' }, h('legend', {}, head),
      Object.entries(x.options!).map(([k, v]) =>
        h('label', { class: 'q__option', lang: 'en' }, h('input', { type: 'radio', name: `q${n}`, value: k, onchange: () => { value = k; } }), ` ${k}  ${v}`)));
    controls.set(n, { get value() { return value; }, set disabled(d: boolean) { group.disabled = d; } } as { value: string; disabled: boolean });
    li.append(group);
    return li;
  }

  function gapQ(n: number, before: string, after: string): HTMLElement {
    const li = h('li', { class: 'q', lang: 'en' });
    items.set(n, li);
    const num = h('span', { class: 'gap__num', 'aria-hidden': 'true' }, n);
    if (!active(n)) { li.append(h('p', {}, num, before, ' ', fixed(q(n)), ' ', after)); return li; }
    const input = h('input', { class: 'gap__input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', lang: 'en', 'aria-label': `Gap ${n}, 1 to 3 words` });
    controls.set(n, input);
    li.append(h('p', {}, num, before, ' ', input, ' ', after));
    return li;
  }

  /** Part 4: one row per speaker with a select for each task. */
  function speakerRow(i: number): HTMLElement {
    const li = h('li', {}, h('p', { lang: 'en' }, h('strong', {}, `Speaker ${i + 1}`)));
    for (const t of [1, 2]) {
      const n = (t - 1) * 5 + i + 1;
      const row = h('p', { class: 'q', lang: 'en' });
      items.set(n, row);
      if (!active(n)) row.append(`Task ${t}: `, fixed(q(n)));
      else {
        const sel = h('select', { class: 'q__select', id: `q${n}` }, h('option', { value: '' }, '–'), 'ABCDEFGH'.split('').map((k) => h('option', { value: k }, k)));
        controls.set(n, sel);
        row.append(h('label', { for: sel.id }, `Task ${t}: `), sel);
      }
      li.append(row);
    }
    return li;
  }

  function body(): HTMLElement {
    const unit = playUnits(set);
    if (set.part === 1)
      return h('div', { class: 'stack' }, set.extracts.map((e, i) =>
        h('section', { class: 'stack' }, h('h2', { lang: 'en' }, unit[i]!.title), h('p', { lang: 'en' }, e.intro), playerBar(unit[i]!),
          h('ol', { class: 'q-list stack', start: String(e.questions[0]!.n) }, e.questions.map((x) => radioQ(x.n, x.stem))))));
    if (set.part === 2)
      return h('div', { class: 'stack' }, playerBar(unit[0]!), h('ol', { class: 'q-list stack' }, set.questions.map((x) => gapQ(x.n, x.before, x.after))));
    if (set.part === 3)
      return h('div', { class: 'stack' }, playerBar(unit[0]!), h('ol', { class: 'q-list stack' }, set.questions.map((x) => radioQ(x.n, x.stem))));
    return h('div', { class: 'stack' }, playerBar(unit[0]!),
      h('div', { class: 'split', lang: 'en' }, ([1, 2] as const).map((t) =>
        h('section', {}, h('h2', {}, `Task ${t}`), h('p', {}, set[`task${t}`].prompt),
          h('dl', { class: 'para-list' }, Object.entries(set[`task${t}`].options).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))))),
      h('ol', { class: 'q-list stack' }, set.speakers.map((_, i) => speakerRow(i))));
  }

  const score = h('p', { class: 'score', 'aria-live': 'polite', tabindex: '-1' });
  const actions = h('div', { class: 'drill__actions' });
  const submit = h('button', { class: 'btn', type: 'submit' }, 'Zkontrolovat odpovědi');
  actions.append(submit);

  const onSubmit = (e: Event): void => {
    e.preventDefault();
    if (embed) return;
    stopAll();
    bars.forEach((b) => b.refresh());
    const now = new Date().toISOString();
    const sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const answers: Record<number, string> = {};
    controls.forEach((c, n) => { answers[n] = c.value; });
    const attempts = buildListeningAttempts(set, answers, sid, now, retry);
    const session = recomputeSession(newSession(set, sid, now, retry ? 'retry' : 'listening'), attempts);
    store.update((d) => { d.sessions.push(session); d.attempts.push(...attempts); });
    qs.filter((x) => active(x.n)).forEach((x) => {
      items.get(x.n)?.classList.add(scoreListening(x, answers[x.n] ?? '') === 1 ? 'is-correct' : 'is-incorrect');
      const c = controls.get(x.n);
      if (c) c.disabled = true;
    });
    submit.disabled = true;
    script.hidden = false;
    score.textContent = `Skóre: ${session.marks}/${session.maxMarks}`;
    actions.append(h('a', { class: 'btn', href: `#/review/${sid}` }, 'Zobrazit vysvětlení'));
    score.focus();
  };

  embed?.({
    answers: () => Object.fromEntries([...controls].map(([n, c]) => [n, c.value])),
    lock: () => { stopAll(); controls.forEach((c) => (c.disabled = true)); script.hidden = false; },
  });
  if (!supported) showError('unsupported');
  const form = h('form', { class: 'drill', onsubmit: onSubmit, onkeydown: (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (blocksImplicitSubmit((e as KeyboardEvent).key, t.tagName, t.type)) e.preventDefault();
  } }, body(), embed ? null : actions, embed ? null : score);

  return {
    title: set.title,
    content: h(embed ? 'section' : 'div', { class: 'stack' },
      h(embed ? 'h2' : 'h1', {}, retry ? 'Opakování chyb: ' : '', h('span', { lang: 'en' }, `Listening Part ${set.part} – ${set.title}`)),
      h('p', {}, labelBadge(set.label), ' ', h('span', { class: 'muted', lang: 'en' }, LISTENING_PARTS[set.part])),
      h('div', { class: 'player-opts' }, h('label', { class: 'field-label', for: 'rate' }, 'Rychlost řeči'), rateSel),
      msg,
      form,
      script,
      embed ? null : h('a', { href: retry ? '#/retry' : `#/listening/${set.part}` }, retry ? 'Zpět na opakování' : 'Zpět na sady'),
    ),
  };
}
