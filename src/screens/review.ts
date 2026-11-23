import { setById } from '../content/loader';
import { isGapSet, isOpen, questionId, recomputeSession, selfMarkAttempt, type GapQuestion } from '../domain/drill';
import type { Attempt, Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';

const scoreText = (s: { marks: number; maxMarks: number }): string => `Skóre: ${s.marks}/${s.maxMarks}`;

function correctText(q: GapQuestion): string {
  return 'options' in q ? `${q.answer} – ${q.options[q.answer]}` : q.answers.join(' / ');
}
function givenText(q: GapQuestion, a: Attempt): string {
  if (!a.answer) return '(bez odpovědi)';
  return 'options' in q ? `${a.answer} – ${q.options[a.answer as 'A'] ?? ''}` : a.answer;
}

export function reviewScreen(store: Store, sessionId: string): ReturnType<Route['render']> {
  const session = store.get().sessions.find((s) => s.id === sessionId);
  const set = session ? setById(session.setIds[0] ?? '') : undefined;
  if (!session || !set || !isGapSet(set))
    return {
      title: 'Nenalezeno',
      content: h('div', { class: 'stack' }, h('h1', {}, 'Výsledek nenalezen'), h('a', { href: '#/' }, 'Zpět na části')),
    };

  const score = h('p', { class: 'score', 'aria-live': 'polite' }, scoreText(session));
  const list = h('ol', { class: 'review-list' });
  const qs: GapQuestion[] = set.questions;

  const item = (q: GapQuestion): HTMLElement => {
    const a = store.get().attempts.find((x) => x.sessionId === sessionId && x.questionId === questionId(set.id, q.n));
    const ok = !!a && a.marks === a.maxMarks;
    const li = h('li', { class: `review-item ${ok ? 'is-correct' : 'is-incorrect'}`, tabindex: '-1' });
    const status = h('span', { 'aria-live': 'polite' });
    const actions = h('div', { class: 'drill__actions' });

    if (a && !ok && isOpen(a.part))
      actions.append(
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => selfMark(a, q) }, 'Myslím, že je to správně'),
      );
    const reported = store.get().issues.some((i) => i.questionId === questionId(set.id, q.n));
    const issueBtn = h('button', { class: 'btn btn--secondary', type: 'button' }, reported ? 'Chyba nahlášena (nahlásit znovu)' : 'Nahlásit chybu');
    issueBtn.addEventListener('click', () => {
      issueBtn.disabled = true;
      const ta = h('textarea', { class: 'input', id: `issue-${q.n}`, rows: 3, maxlength: 1000 });
      const form = h(
        'form',
        { class: 'stack', onsubmit: (e: Event) => {
          e.preventDefault();
          const note = ta.value.trim();
          if (!note) return;
          store.update((d) => {
            d.issues.push({ questionId: questionId(set.id, q.n), note, at: new Date().toISOString() });
          });
          form.remove();
          issueBtn.disabled = false;
          status.textContent = 'Nahlášení uloženo.';
        } },
        h('label', { class: 'field-label', for: `issue-${q.n}` }, 'Co je špatně?'),
        ta,
        h('button', { class: 'btn', type: 'submit' }, 'Uložit nahlášení'),
      );
      li.append(form);
      ta.focus();
    });
    actions.append(issueBtn);

    li.append(
      h('p', { class: 'result' },
        h('span', { class: 'result__icon', 'aria-hidden': 'true' }),
        h('span', { class: 'result__text' }, `Otázka ${q.n}: ${ok ? (a?.selfMarked ? 'Správně (označeno ručně)' : 'Správně') : 'Špatně'}`),
      ),
      h('dl', {},
        h('dt', {}, 'Moje odpověď'), h('dd', { lang: 'en' }, a ? givenText(q, a) : ''),
        h('dt', {}, 'Správná odpověď'), h('dd', { lang: 'en' }, correctText(q)),
        h('dt', {}, 'Typ'), h('dd', {}, h('span', { class: 'tag' }, q.type)),
        h('dt', {}, 'Zdroj'), h('dd', {}, labelBadge(set.label)),
      ),
      h('div', { class: 'review-item__explanation' },
        h('p', { lang: 'en' }, q.explanation.en),
        h('p', { lang: 'cs' }, q.explanation.cs),
      ),
      actions,
      status,
    );
    return li;
  };

  function selfMark(a: Attempt, q: GapQuestion): void {
    store.update((d) => {
      const i = d.attempts.findIndex((x) => x.id === a.id);
      if (i >= 0) d.attempts[i] = selfMarkAttempt(d.attempts[i]!);
      const si = d.sessions.findIndex((s) => s.id === sessionId);
      if (si >= 0) d.sessions[si] = recomputeSession(d.sessions[si]!, d.attempts);
    });
    const idx = qs.indexOf(q);
    const fresh = item(q);
    list.children[idx]?.replaceWith(fresh);
    const s = store.get().sessions.find((x) => x.id === sessionId);
    if (s) score.textContent = scoreText(s);
    fresh.focus();
  }

  list.append(...qs.map(item));

  return {
    title: 'Přehled odpovědí',
    content: h(
      'div',
      { class: 'stack' },
      h('h1', {}, `Přehled – ${set.title}`),
      score,
      list,
      h('div', { class: 'drill__actions' },
        h('a', { class: 'btn', href: `#/drill/${set.id}` }, 'Zkusit znovu'),
        h('a', { class: 'btn btn--secondary', href: `#/part/${set.part}` }, 'Zpět na sady'),
        h('a', { class: 'btn btn--secondary', href: '#/' }, 'Zpět na části'),
      ),
    ),
  };
}
