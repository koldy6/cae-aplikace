import './styles/main.css';
import { LocalAdapter } from './storage/localAdapter';
import { createStore } from './storage/store';
import { listeningById } from './content/loader';
import { drillScreen } from './screens/drill';
import { listeningDrillScreen } from './screens/listening';
import { homeScreen, partScreen, settingsScreen } from './screens/home';
import { progressScreen, retryScreen, weakScreen } from './screens/progress';
import { writingListScreen, writingScreen } from './screens/writing';
import { speakingListScreen, speakingSetScreen } from './screens/speaking';
import { mockScreen } from './screens/mock';
import { reviewScreen } from './screens/review';
import { footer } from './ui/components';
import { h } from './ui/h';
import { startRouter, type Route } from './ui/router';

const store = createStore(new LocalAdapter());

const banner = h('div', { class: 'notice', role: 'status', hidden: true },
  'Prohlížeč neumožňuje ukládání: výsledky se neuloží po zavření stránky. ',
  h('span', { lang: 'en' }, '(Progress is not being saved.)'),
);
const showBanner = (): void => {
  banner.hidden = !store.memoryMode;
};
showBanner();
store.onMemoryMode(showBanner);

const nav = h('nav', { class: 'site-nav', 'aria-label': 'Hlavní' },
  h('a', { href: '#/', 'data-path': '/' }, 'Domů'),
  h('a', { href: '#/writing', 'data-path': '/writing' }, 'Writing'),
  h('a', { href: '#/speaking', 'data-path': '/speaking' }, 'Speaking'),
  h('a', { href: '#/mock', 'data-path': '/mock' }, 'Mini mock'),
  h('a', { href: '#/progress', 'data-path': '/progress' }, 'Pokrok'),
  h('a', { href: '#/weak', 'data-path': '/weak' }, 'Slabá místa'),
  h('a', { href: '#/retry', 'data-path': '/retry' }, 'Opakování'),
  h('a', { href: '#/settings', 'data-path': '/settings' }, 'Nastavení'),
);
const main = h('main', { class: 'page', id: 'main', tabindex: '-1' });

const routes: Route[] = [
  { pattern: /^\/$/, render: () => homeScreen(store) },
  { pattern: /^\/settings$/, render: () => settingsScreen(store) },
  { pattern: /^\/part\/(\d+)$/, render: ([p]) => partScreen(store, p ?? '') },
  { pattern: /^\/drill\/([\w-]+)$/, render: ([id]) => { const ls = listeningById(id ?? ''); return ls ? listeningDrillScreen(store, ls) : drillScreen(store, id ?? ''); } },
  { pattern: /^\/listening\/(\d+)$/, render: ([p]) => partScreen(store, p ?? '', 'listening') },
  { pattern: /^\/writing$/, render: () => writingListScreen(store) },
  { pattern: /^\/writing\/([\w-]+)$/, render: ([id]) => writingScreen(store, id ?? '') },
  { pattern: /^\/speaking$/, render: () => speakingListScreen(store) },
  { pattern: /^\/speaking\/([\w-]+)$/, render: ([id]) => speakingSetScreen(store, id ?? '') },
  { pattern: /^\/progress$/, render: () => progressScreen(store) },
  { pattern: /^\/weak$/, render: () => weakScreen(store) },
  { pattern: /^\/retry$/, render: () => retryScreen(store) },
  { pattern: /^\/retry\/([\w-]+)$/, render: ([id]) => retryScreen(store, id ?? '') },
  { pattern: /^\/mock$/, render: () => mockScreen(store) },
  { pattern: /^\/review\/([\w-]+)(?:\/([\w-]+))?$/, render: ([id, set]) => reviewScreen(store, id ?? '', set) },
  {
    pattern: /.*/,
    render: () => ({
      title: 'Nenalezeno',
      content: h('div', { class: 'stack' }, h('h1', {}, 'Stránka nenalezena'), h('a', { href: '#/' }, 'Domů')),
    }),
  },
];

document.getElementById('app')?.append(
  h('a', { class: 'skip-link', href: '#main', onclick: (e: Event) => { e.preventDefault(); main.focus(); } }, 'Přeskočit na obsah'),
  h('header', { class: 'site-header' }, h('a', { class: 'brand', href: '#/' }, 'CAE English'), nav),
  banner,
  main,
  footer(),
);

startRouter(main, routes, (path) => {
  nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.path === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
});
