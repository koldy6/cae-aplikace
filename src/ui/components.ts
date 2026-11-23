import { h } from './h';

export const NOTICE_EN = 'Not official Cambridge material';

export function labelBadge(label: 'ai-generated' | 'official-format-reference'): HTMLElement {
  return label === 'ai-generated'
    ? h('span', { class: 'badge badge--ai', lang: 'en' }, 'AI-generated practice in the C1 Advanced format')
    : h('span', { class: 'badge badge--ref', lang: 'en' }, 'Official format reference');
}

export function footer(): HTMLElement {
  return h(
    'footer',
    { class: 'site-footer' },
    h('p', {}, h('span', { lang: 'en' }, NOTICE_EN), '. ', h('span', { lang: 'cs' }, 'Jde o procvičovací materiál, ne o oficiální zkoušku Cambridge.')),
  );
}

export const link = (href: string, text: string, cls = ''): HTMLAnchorElement => h('a', { href, class: cls }, text);
