import { listeningById, setById } from '../content/loader';
import { isDrillSet, isOpen, questionId, questionsOf, recomputeSession, selfMarkAttempt, type DrillQuestion, type DrillSet } from '../domain/drill';
import type { Attempt, Store } from '../storage/store';
import { correctListening, givenListening, listeningQuestions } from '../domain/listening';
import { scriptView } from './listening';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import type { Route } from '../ui/router';

const scoreText = (s: { marks: number; maxMarks: number }): string => `Skóre: ${s.marks}/${s.maxMarks}`;

function correctText(set: DrillSet, q: DrillQuestion): string {
  if (set.part === 4) return (q as Extract<DrillSet, { part: 4 }>['items'][number]).fullAnswers.join(' / ');
  if (set.part === 7) {
    const k = (q as { answer: string }).answer;
    return `${k} – ${set.paragraphs.find((p) => p.id === k)?.text.slice(0, 80) ?? ''}…`;
  }
  if (set.part === 6 || set.part === 8) {
    const k = (q as { answer: string }).answer;
    const pool: { id: string; heading: string }[] = set.part === 6 ? set.texts : set.sections;
    return `${k} – ${pool.find((x) => x.id === k)?.heading ?? ''}`;
  }
  const g = q as Extract<DrillSet, { part: 1 | 2 | 3 | 5 }>['questions'][number];
  return 'options' in g ? `${g.answer} – ${g.options[g.answer]}` : g.answers.join(' / ');
}
function givenText(set: DrillSet, q: DrillQuestion, a: Attempt): string {
  if (!a.answer) return '(bez odpovědi)';
  return (set.part === 1 || set.part === 5) && 'options' in q ? `${a.answer} – ${q.options[a.answer as 'A'] ?? ''}` : a.answer;
}

export function reviewScreen(store: Store, sessionId: string, setId?: string): ReturnType<Route['render']> {
  const session = store.get().sessions.find((s) => s.id === sessionId);
  const lset = session ? listeningById(setId ?? session.setIds[0] ?? '') : undefined;
  const set = lset ? undefined : session ? setById(setId ?? session.setIds[0] ?? '') : undefined;
  if (!session || (!lset && (!set || !isDrillSet(set))))
    return {
      title: 'Nenalezeno',
      content: h('div', { class: 'stack' }, h('h1', {}, 'Výsledek nenalezen'), h('a', { href: '#/' }, 'Zpět na části')),
    };

  const score = h('p', { class: 'score', 'aria-live': 'polite' }, scoreText(session));
  const list = h('ol', { class: 'review-list' });
  const attempted = new Set(store.get().attempts.filter((x) => x.sessionId === sessionId).map((x) => x.questionId));
  // a retry session only has attempts for the retried questions
  const info = (lset ?? set)!;
  interface Row { n: number; type: string; explanation: { en: string; cs: string }; correct: string; given: (a: Attempt) => string; open: boolean }
  const all: Row[] = lset
    ? listeningQuestions(lset).map((x) => ({ n: x.n, type: x.type, explanation: x.explanation, correct: correctListening(x), given: (a) => givenListening(x, a.answer), open: !x.options }))
    : questionsOf(set as DrillSet).map((x) => ({ n: x.n, type: x.type, explanation: x.explanation, correct: correctText(set as DrillSet, x), given: (a) => givenText(set as DrillSet, x, a), open: isOpen(info.part) }));
  const qs = all.filter((q) => attempted.has(questionId(info.id, q.n)));

  const item = (q: Row): HTMLElement => {
    const a = store.get().attempts.find((x) => x.sessionId === sessionId && x.questionId === questionId(info.id, q.n));
    const ok = !!a && a.marks === a.maxMarks;
    const li = h('li', { class: `review-item ${ok ? 'is-correct' : 'is-incorrect'}`, tabindex: '-1' });
    const status = h('span', { 'aria-live': 'polite' });
    const actions = h('div', { class: 'drill__actions' });

    if (a && !ok && q.open)
      actions.append(
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => selfMark(a, q) }, 'Myslím, že je to správně'),
      );
    const reported = store.get().issues.some((i) => i.questionId === questionId(info.id, q.n));
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
            d.issues.push({ questionId: questionId(info.id, q.n), note, at: new Date().toISOString() });
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
        h('span', { class: 'result__text' }, `Otázka ${q.n}: ${ok ? (a?.selfMarked ? 'Správně (označeno ručně)' : 'Správně') : a && a.marks > 0 ? 'Částečně správně' : 'Špatně'}${a && a.maxMarks > 1 ? ` – ${a.marks}/${a.maxMarks} body` : ''}`),
      ),
      h('dl', {},
        h('dt', {}, 'Moje odpověď'), h('dd', { lang: 'en' }, a ? q.given(a) : ''),
        h('dt', {}, 'Správná odpověď'), h('dd', { lang: 'en' }, q.correct),
        h('dt', {}, 'Typ'), h('dd', {}, h('span', { class: 'tag' }, q.type)),
        h('dt', {}, 'Zdroj'), h('dd', {}, labelBadge(info.label)),
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

  function selfMark(a: Attempt, q: Row): void {
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
      h('h1', {}, 'Přehled – ', h('span', { lang: 'en' }, info.title)),
      score,
      list,
      lset ? scriptView(lset) : null,
      h('div', { class: 'drill__actions' },
        h('a', { class: 'btn', href: `#/drill/${info.id}` }, 'Zkusit znovu'),
        h('a', { class: 'btn btn--secondary', href: info.paper === 'listening' ? `#/listening/${info.part}` : `#/part/${info.part}` }, 'Zpět na sady'),
        h('a', { class: 'btn btn--secondary', href: '#/' }, 'Zpět na části'),
      ),
    ),
  };
}
