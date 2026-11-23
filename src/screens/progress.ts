import { setById } from '../content/loader';
import { isDrillSet } from '../domain/drill';
import { formatArea, meterClass, partStats, percentText, retryGroups, sessionsNewestFirst } from '../domain/progress';
import { areaStats, errorLog, MIN_ATTEMPTS, weakestAreas, weekActivity } from '../domain/weakAreas';
import type { Store } from '../storage/store';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { drillScreen } from './drill';

type Screen = ReturnType<Route['render']>;

const dateText = (iso: string): string => new Date(iso).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
const emptyNote = (text: string): HTMLElement => h('p', { class: 'notice', role: 'status' }, text);

export function progressScreen(store: Store): Screen {
  const { sessions, attempts } = store.get();
  const parts = partStats(attempts);
  const week = weekActivity(attempts, new Date());

  const sessionList = sessionsNewestFirst(sessions).map((s) =>
    h('li', { class: 'set-item' },
      h('span', {}, dateText(s.startedAt)),
      h('strong', { lang: 'en' }, setById(s.setIds[0] ?? '')?.title ?? s.setIds.join(', ')),
      s.kind === 'retry' ? h('span', { class: 'tag' }, 'opakování') : null,
      h('span', { class: 'score' }, `${s.marks}/${s.maxMarks}`),
    ),
  );

  return {
    title: 'Pokrok',
    content: h('div', { class: 'stack' },
      h('h1', {}, 'Pokrok'),
      h('h2', {}, 'Posledních 7 dní'),
      h('ul', { class: 'week' }, week.map((d) =>
        h('li', {}, h('span', { class: 'muted' }, d.date.slice(5)), h('strong', {}, d.attempts), h('span', { class: 'visually-hidden' }, ' odpovědí')),
      )),
      h('h2', {}, 'Úspěšnost podle částí'),
      parts.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'stats' },
            h('caption', { class: 'visually-hidden' }, 'Úspěšnost podle částí'),
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Část'), h('th', { scope: 'col' }, 'Odpovědí'), h('th', { scope: 'col' }, 'Úspěšnost'))),
            h('tbody', {}, parts.map((p) => h('tr', {}, h('th', { scope: 'row' }, `Part ${p.part}`), h('td', {}, p.n), h('td', {}, percentText(p.accuracy)))))))
        : emptyNote('Zatím žádné odpovědi. Zkus některé cvičení.'),
      h('h2', {}, 'Dokončená cvičení'),
      sessionList.length ? h('ul', { class: 'set-list' }, sessionList) : emptyNote('Zatím žádná dokončená cvičení.'),
    ),
  };
}

export function weakScreen(store: Store): Screen {
  const { attempts } = store.get();
  const all = areaStats(attempts).sort((a, b) => a.part - b.part || a.type.localeCompare(b.type));
  const weak = weakestAreas(attempts);
  const weakKeys = new Set(weak.map((w) => `${w.paper}|${w.part}|${w.type}`));
  const small = all.filter((a) => !a.eligible);

  return {
    title: 'Slabá místa',
    content: h('div', { class: 'stack' },
      h('h1', {}, 'Slabá místa'),
      h('h2', {}, 'Nejslabší typy úloh'),
      weak.length
        ? h('ol', { class: 'weak-list' }, weak.map((w) =>
            h('li', { class: 'weak-item is-weak' },
              h('span', { class: 'weak-item__name', lang: 'en' }, formatArea(w)),
              h('div', { class: 'meter', 'aria-hidden': 'true' }, h('div', { class: `meter__bar ${meterClass(w.accuracy)}` })),
              h('a', { class: 'btn btn--secondary', href: '#/retry' }, 'Opakovat chyby'),
            )))
        : emptyNote(`Zatím není dost dat: typ úloh se hodnotí od ${MIN_ATTEMPTS} zodpovězených otázek.`),
      h('h2', {}, 'Všechny typy úloh'),
      all.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'stats' },
            h('caption', { class: 'visually-hidden' }, 'Úspěšnost podle části a typu úlohy'),
            h('thead', {}, h('tr', {},
              h('th', { scope: 'col' }, 'Část'), h('th', { scope: 'col' }, 'Typ'), h('th', { scope: 'col' }, 'Odpovědí'), h('th', { scope: 'col' }, 'Úspěšnost'))),
            h('tbody', {}, all.map((a) =>
              h('tr', { class: weakKeys.has(`${a.paper}|${a.part}|${a.type}`) ? 'is-weak' : '' },
                h('th', { scope: 'row' }, `Part ${a.part}`),
                h('td', { lang: 'en' }, a.type, weakKeys.has(`${a.paper}|${a.part}|${a.type}`) ? h('span', { class: 'visually-hidden', lang: 'cs' }, ' (slabé místo)') : null),
                h('td', {}, a.n),
                h('td', {}, percentText(a.accuracy), a.eligible ? null : ' *'),
              )))))
        : emptyNote('Zatím žádné odpovědi.'),
      small.length ? h('p', { class: 'muted' }, `* Příliš málo odpovědí (n < ${MIN_ATTEMPTS}): do žebříčku nejslabších se nezapočítává.`) : null,
    ),
  };
}

export function retryScreen(store: Store, setId?: string): Screen {
  const groups = retryGroups(errorLog(store.get().attempts));
  if (setId) {
    const set = setById(setId);
    const g = groups.find((x) => x.setId === setId);
    if (set && isDrillSet(set) && g) return drillScreen(store, setId, new Set(g.ns));
  }
  return {
    title: 'Opakování chyb',
    content: h('div', { class: 'stack' },
      h('h1', {}, 'Opakování chyb'),
      groups.length
        ? h('ul', { class: 'set-list' }, groups.map((g) =>
            h('li', { class: 'set-item' },
              h('strong', { lang: 'en' }, setById(g.setId)?.title ?? g.setId),
              h('span', {}, `Chyb: ${g.ns.length}`),
              h('a', { class: 'btn', href: `#/retry/${g.setId}` }, 'Opakovat'),
            )))
        : emptyNote(setId ? 'V této sadě už nejsou žádné chyby k opakování.' : 'Nemáš žádné chyby k opakování.'),
      h('a', { href: '#/' }, 'Zpět na části'),
    ),
  };
}
