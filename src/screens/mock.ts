import { listeningSets, setsFor } from '../content/loader';
import { isDrillSet, type Embedded } from '../domain/drill';
import { announceAt, budgetOverride, budgetSeconds, buildMock, clock, partBreakdown, questionCount, remainingSeconds, selectMock, shouldAutoSubmit, type MockItem } from '../domain/mock';
import { partName } from '../domain/progress';
import type { Session, Store } from '../storage/store';
import { h } from '../ui/h';
import type { Route } from '../ui/router';
import { drillScreen } from './drill';
import { listeningDrillScreen } from './listening';

const minutes = (s: number): string => (s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

export function mockScreen(store: Store): ReturnType<Route['render']> {
  const root = h('div', { class: 'stack' });
  const override = budgetOverride(window.location.search);
  const hasListening = listeningSets(1).length > 0;
  const attempted = new Set(store.get().attempts.map((a) => a.setId));
  const seed = Date.now();
  const pools = { rue: (p: number) => setsFor('rue', p).filter(isDrillSet), listening: (p: number) => listeningSets(p) };
  let items: MockItem[] = [];
  const total = (): number => override ?? budgetSeconds(items);

  // ---- start ----
  function start(): void {
    const withL = h('input', { type: 'checkbox', id: 'mock-listening', checked: hasListening, disabled: !hasListening, onchange: () => refresh() });
    const list = h('ul', { lang: 'en' });
    const budget = h('p', { role: 'status' });
    const go = h('button', { class: 'btn', type: 'button', onclick: () => run() }, 'Spustit mock');
    function refresh(): void {
      items = selectMock(pools, attempted, seed, withL.checked);
      list.replaceChildren(...items.map((i) => h('li', {}, `${partName(i.paper, i.set.part)} – ${i.set.title} (${questionCount(i)} questions)`)));
      const q = items.reduce((s, i) => s + questionCount(i), 0);
      budget.textContent = `Časový limit: ${minutes(total())} (${q} otázek, asi 1,6 min na otázku jako u zkoušky: 90 min na 56 otázek).${override ? ' Vývojový override ?mockSeconds je aktivní.' : ''}`;
      go.disabled = !items.length;
    }
    root.replaceChildren(
      h('h1', {}, 'Mini mock'),
      h('p', { class: 'notice' }, 'Není to oficiální mock zkoušky. Výsledek jsou jen hrubé body (bez cambridgeské škály a bez známky).'),
      h('p', {}, 'Jedna sada z každé části Reading and Use of English 1–4 a volitelně Listening Part 1, vše na jedné stránce. Sady, které jsi ještě nedělal(a), mají přednost.'),
      h('div', {}, withL, ' ', h('label', { for: 'mock-listening' }, 'Zahrnout Listening Part 1 (přehrávání je omezené jako u zkoušky, viz Nastavení)')),
      h('h2', {}, 'Obsah'), list, budget,
      h('p', {}, 'Po vypršení času se odpovědi odešlou automaticky.'),
      go,
    );
    refresh();
  }

  // ---- run ----
  function run(): void {
    const handles: Embedded[] = [];
    const bodies = items.map((it, i) =>
      (it.paper === 'rue' ? drillScreen(store, it.set.id, undefined, (e) => (handles[i] = e)) : listeningDrillScreen(store, it.set, undefined, (e) => (handles[i] = e))).content,
    );
    const startedAt = new Date();
    const deadline = startedAt.getTime() + total() * 1000;
    const shown = h('strong', { 'aria-hidden': 'true' }, clock(total()));
    const live = h('span', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    const finishBtn = h('button', { class: 'btn', type: 'button', onclick: () => finish(false) }, 'Odevzdat mock');
    let done = false;
    let lastSaid = -1;
    const timer = window.setInterval(() => {
      if (!root.isConnected) return void window.clearInterval(timer); // user navigated away: nothing is saved
      const left = remainingSeconds(Date.now(), deadline);
      shown.textContent = clock(left);
      if (announceAt(left) && left !== lastSaid) {
        lastSaid = left;
        live.textContent = left >= 60 ? `Zbývá ${Math.round(left / 60)} min` : `Zbývá ${left} sekund`;
      }
      if (shouldAutoSubmit(Date.now(), deadline)) finish(true);
    }, 1000);

    function finish(auto: boolean): void {
      if (done) return;
      done = true;
      window.clearInterval(timer);
      const answers = handles.map((e) => e.answers());
      handles.forEach((e) => e.lock());
      const now = new Date();
      const sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { session, attempts } = buildMock(items, answers, sid, startedAt.toISOString());
      const saved = { ...session, finishedAt: now.toISOString() };
      store.update((d) => { d.sessions.push(saved); d.attempts.push(...attempts); });
      result(saved, auto, Math.round((now.getTime() - startedAt.getTime()) / 1000), bodies);
    }

    root.replaceChildren(
      h('div', { class: 'mock-bar' }, h('span', {}, 'Zbývá: ', shown), live, finishBtn),
      h('h1', {}, 'Mini mock'),
      ...bodies,
      h('div', { class: 'drill__actions' }, h('button', { class: 'btn', type: 'button', onclick: () => finish(false) }, 'Odevzdat mock')),
    );
    live.textContent = `Mock spuštěn, limit ${minutes(total())}`;
  }

  // ---- result ----
  function result(s: Session, auto: boolean, used: number, bodies: Node[]): void {
    const rows = partBreakdown(items, s);
    const head = h('div', { class: 'stack' },
      h('h1', {}, 'Výsledek mini mocku'),
      auto ? h('p', { class: 'notice', role: 'status' }, 'Čas vypršel, odpovědi byly odeslány automaticky.') : null,
      h('p', { class: 'score', 'aria-live': 'polite', tabindex: '-1' }, `Celkem: ${s.marks}/${s.maxMarks} bodů (hrubé body, bez škály a známky)`),
      h('p', { class: 'muted' }, `Čas: ${clock(used)} z ${clock(total())}`),
      h('div', { class: 'table-wrap' }, h('table', { class: 'stats' },
        h('caption', { class: 'visually-hidden' }, 'Body podle částí'),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Část'), h('th', { scope: 'col' }, 'Body'), h('th', { scope: 'col' }, 'Vysvětlení'))),
        h('tbody', {}, rows.map((r) => h('tr', {},
          h('th', { scope: 'row' }, partName(r.paper, r.part)),
          h('td', {}, `${r.marks}/${r.maxMarks}`),
          h('td', {}, h('a', { href: `#/review/${s.id}/${r.setId}` }, 'Zobrazit vysvětlení'), h('span', { class: 'visually-hidden' }, ` ${partName(r.paper, r.part)}`)))),
        ))),
      h('div', { class: 'drill__actions' },
        h('a', { class: 'btn', href: '#/progress' }, 'Pokrok'),
        h('a', { class: 'btn btn--secondary', href: '#/' }, 'Domů')),
    );
    root.replaceChildren(head, h('h2', {}, 'Tvoje odpovědi'), ...bodies);
    head.querySelector<HTMLElement>('.score')?.focus();
  }

  start();
  return { title: 'Mini mock', content: root };
}
