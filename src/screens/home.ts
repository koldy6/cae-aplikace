import { setsFor } from '../content/loader';
import { daysToExam, isDrillSet, lastScore } from '../domain/drill';
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
  const tiles = Object.entries(PARTS).map(([k, sub]) => {
    const part = Number(k);
    const ready = playableSets(part).length > 0;
    const body = [
      h('span', { class: 'part-tile__title' }, `Part ${part}`),
      h('span', { class: 'part-tile__sub', lang: 'en' }, sub),
      h('span', { class: 'part-tile__status' }, ready ? `Sad: ${playableSets(part).length}` : 'připravujeme'),
    ];
    return h(
      'li',
      {},
      ready
        ? h('a', { class: 'part-tile', href: `#/part/${part}` }, body)
        : h('a', { class: 'part-tile is-disabled', 'aria-disabled': 'true', role: 'link', tabindex: '-1' }, body),
    );
  });
  return {
    title: 'Domů',
    content: h('div', { class: 'stack' }, h('h1', {}, 'Reading and Use of English'), countdown, h('ul', { class: 'part-grid' }, tiles)),
  };
}

export function partScreen(store: Store, partStr: string): ReturnType<Route['render']> {
  const part = Number(partStr);
  const sets = playableSets(part);
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
    title: `Part ${part}`,
    content: h(
      'div',
      { class: 'stack' },
      h('h1', { lang: 'en' }, `Part ${part} – ${PARTS[part] ?? ''}`),
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
    ),
  };
}
