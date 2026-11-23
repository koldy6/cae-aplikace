import './styles/main.css';
import { LocalAdapter } from './storage/localAdapter';
import { createStore } from './storage/store';
import { drillScreen } from './screens/drill';
import { homeScreen, partScreen, settingsScreen } from './screens/home';
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
  h('a', { href: '#/settings', 'data-path': '/settings' }, 'Nastavení'),
);
const main = h('main', { class: 'page', id: 'main', tabindex: '-1' });

const routes: Route[] = [
  { pattern: /^\/$/, render: () => homeScreen(store) },
  { pattern: /^\/settings$/, render: () => settingsScreen(store) },
  { pattern: /^\/part\/(\d+)$/, render: ([p]) => partScreen(store, p ?? '') },
  { pattern: /^\/drill\/([\w-]+)$/, render: ([id]) => drillScreen(store, id ?? '') },
  { pattern: /^\/review\/([\w-]+)$/, render: ([id]) => reviewScreen(store, id ?? '') },
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
