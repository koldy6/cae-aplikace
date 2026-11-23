import { listeningSets, setsFor } from '../content/loader';
import { loadVoices, browserEnv, rankVoices } from '../media/tts';
import { daysToExam, isDrillSet, lastScore } from '../domain/drill';
import { backupReminder, backupSection } from '../storage/backup';
import type { Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';

export const PARTS: Record<number, string> = {
  1: 'Multiple-choice cloze',
  2: 'Open cloze',
  3: 'Word formation',
  4: 'Key word transformation',
  5: 'Multiple choice (long text)',
  6: 'Cross-text multiple matching',
  7: 'Gapped text',
  8: 'Multiple matching',
};

export const LISTENING_PARTS: Record<number, string> = {
  1: 'Multiple choice (extracts)',
  2: 'Sentence completion',
  3: 'Multiple choice (long recording)',
  4: 'Multiple matching',
};

/** Sets with a drill screen for a part: R&UoE or Listening. */
const setsOf = (paper: 'rue' | 'listening', part: number) => (paper === 'listening' ? listeningSets(part) : playableSets(part));

/** A part is playable when it has content and a drill screen. */
const playableSets = (part: number) => setsFor('rue', part).filter(isDrillSet);

export function homeScreen(store: Store): ReturnType<Route['render']> {
  const days = daysToExam(store.get().settings.examDate, new Date());
  const countdown =
    days === null
      ? h('p', { class: 'countdown' }, 'Datum zkoušky zatím není nastaveno. ', h('a', { href: '#/settings' }, 'Nastavit datum'))
      : h(
          'p',
          { class: 'countdown' },
          days > 0 ? `Do zkoušky zbývá dní: ${days}` : days === 0 ? 'Zkouška je dnes.' : `Zkouška byla před ${-days} dny.`,
        );
  const tiles = (paper: 'rue' | 'listening', parts: Record<number, string>) => Object.entries(parts).map(([k, sub]) => {
    const part = Number(k);
    const n = setsOf(paper, part).length;
    const body = [
      h('span', { class: 'part-tile__title' }, `Part ${part}`),
      h('span', { class: 'part-tile__sub', lang: 'en' }, sub),
      h('span', { class: 'part-tile__status' }, n ? `Sad: ${n}` : 'připravujeme'),
    ];
    return h(
      'li',
      {},
      n
        ? h('a', { class: 'part-tile', href: paper === 'listening' ? `#/listening/${part}` : `#/part/${part}` }, body)
        : h('a', { class: 'part-tile is-disabled', 'aria-disabled': 'true', role: 'link', tabindex: '-1' }, body),
    );
  });
  return {
    title: 'Domů',
    content: h('div', { class: 'stack' }, h('h1', {}, 'Reading and Use of English'), backupReminder(store), countdown, h('ul', { class: 'part-grid' }, tiles('rue', PARTS)), h('h2', {}, 'Listening'), h('ul', { class: 'part-grid' }, tiles('listening', LISTENING_PARTS)), h('h2', {}, 'Mini mock'), h('ul', { class: 'part-grid' }, h('li', {}, h('a', { class: 'part-tile', href: '#/mock' }, h('span', { class: 'part-tile__title' }, 'Mini mock'), h('span', { class: 'part-tile__sub', lang: 'en' }, 'Timed Reading and Use of English + Listening'), h('span', { class: 'part-tile__status' }, 'Hrubé body, s odpočtem času')))), h('h2', {}, 'Writing'), h('ul', { class: 'part-grid' }, h('li', {}, h('a', { class: 'part-tile', href: '#/writing' }, h('span', { class: 'part-tile__title' }, 'Writing'), h('span', { class: 'part-tile__sub', lang: 'en' }, 'Essay, letter, report…'), h('span', { class: 'part-tile__status' }, 'Zpětná vazba přes claude.ai'))), h('li', {}, h('a', { class: 'part-tile', href: '#/speaking' }, h('span', { class: 'part-tile__title' }, 'Speaking'), h('span', { class: 'part-tile__sub', lang: 'en' }, 'Parts 1–4, recording'), h('span', { class: 'part-tile__status' }, 'Nahrávání + zpětná vazba přes claude.ai'))))),
  };
}

export function partScreen(store: Store, partStr: string, paper: 'rue' | 'listening' = 'rue'): ReturnType<Route['render']> {
  const part = Number(partStr);
  const sets = setsOf(paper, part);
  if (!sets.length)
    return {
      title: 'Nenalezeno',
      content: h('div', { class: 'stack' }, h('h1', {}, 'Tato část zatím není připravena'), h('a', { href: '#/' }, 'Zpět na části')),
    };
  const items = sets.map((s) => {
    const score = lastScore(store.get().sessions, s.id);
    return h(
      'li',
      { class: 'set-item' },
      h('a', { class: 'set-item__link', lang: 'en', href: `#/drill/${s.id}` }, s.title),
      labelBadge(s.label),
      h('span', { class: 'set-item__score' }, score ? `Poslední skóre: ${score}` : 'Zatím nezkoušeno'),
    );
  });
  return {
    title: `${paper === 'listening' ? 'Listening ' : ''}Part ${part}`,
    content: h(
      'div',
      { class: 'stack' },
      h('h1', { lang: 'en' }, `${paper === 'listening' ? 'Listening ' : ''}Part ${part} – ${(paper === 'listening' ? LISTENING_PARTS : PARTS)[part] ?? ''}`),
      h('ul', { class: 'set-list' }, items),
      h('a', { href: '#/' }, 'Zpět na části'),
    ),
  };
}

export function settingsScreen(store: Store): ReturnType<Route['render']> {
  const input = h('input', { class: 'input', id: 'exam-date', type: 'date', value: store.get().settings.examDate ?? '' });
  const status = h('p', { role: 'status' });
  const save = (e: Event): void => {
    e.preventDefault();
    const v = input.value || null;
    store.update((d) => {
      d.settings.examDate = v;
    });
    status.textContent = v ? 'Datum uloženo.' : 'Datum smazáno.';
  };
  return {
    title: 'Nastavení',
    content: h(
      'div',
      { class: 'stack' },
      h('h1', {}, 'Nastavení'),
      h(
        'form',
        { class: 'stack', onsubmit: save },
        h('div', {}, h('label', { class: 'field-label', for: 'exam-date' }, 'Datum zkoušky'), input),
        h('button', { class: 'btn', type: 'submit' }, 'Uložit'),
      ),
      status,
      listeningSettings(store),
      backupSection(store),
    ),
  };
}

/** Listening: voices (from the browser), rate and play limit. Saved on change. */
function listeningSettings(store: Store): HTMLElement {
  const s = store.get().settings;
  const save = (f: (x: typeof s) => void): void => store.update((d) => f(d.settings));
  const voiceSel = (id: string, label: string, cur: string | null, set: (v: string | null) => void) => {
    const sel = h('select', { class: 'input', id, onchange: () => save(() => set(sel.value || null)) }, h('option', { value: '' }, 'Automaticky'));
    return { sel, row: h('div', {}, h('label', { class: 'field-label', for: id }, label), sel), cur };
  };
  const a = voiceSel('tts-a', 'Hlas A', s.ttsVoiceA, (v) => (store.get().settings.ttsVoiceA = v));
  const b = voiceSel('tts-b', 'Hlas B', s.ttsVoiceB, (v) => (store.get().settings.ttsVoiceB = v));
  const note = h('p', { class: 'muted', role: 'status' }, 'Načítám hlasy…');
  void loadVoices(browserEnv().synth).then((vs) => {
    const ranked = rankVoices(vs);
    note.textContent = ranked.length ? '' : 'Prohlížeč nenabízí žádné anglické hlasy; Listening se zobrazí jen jako text.';
    for (const x of [a, b]) {
      x.sel.append(...ranked.map((v) => h('option', { value: v.name }, `${v.name} (${v.lang})`)));
      x.sel.value = x.cur ?? '';
    }
  });
  const rate = h('select', { class: 'input', id: 'tts-rate', onchange: () => save((x) => (x.ttsRate = Number(rate.value))) },
    RATES.map((r) => h('option', { value: r }, `${r}×`)));
  rate.value = String(RATES.includes(s.ttsRate) ? s.ttsRate : 1);
  const limit = h('select', { class: 'input', id: 'tts-limit', onchange: () => save((x) => (x.listeningPlayLimit = limit.value === '2' ? 2 : null)) },
    h('option', { value: '2' }, '2× (jako u zkoušky)'), h('option', { value: 'null' }, 'Neomezeně'));
  limit.value = s.listeningPlayLimit === null ? 'null' : '2';
  return h('section', { class: 'stack' }, h('h2', {}, 'Listening'), a.row, b.row, note,
    h('div', {}, h('label', { class: 'field-label', for: 'tts-rate' }, 'Rychlost řeči'), rate),
    h('div', {}, h('label', { class: 'field-label', for: 'tts-limit' }, 'Počet přehrání'), limit));
}

export const RATES = [0.75, 0.9, 1, 1.1, 1.25];
