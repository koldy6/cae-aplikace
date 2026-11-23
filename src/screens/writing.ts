import { formatReference, writingById, writingTasks } from '../content/loader';
import type { FormatReference, WritingTask } from '../content/types';
import { buildWritingPrompt, wordCount, wordState } from '../domain/prompts';
import type { Store, WritingEntry } from '../storage/store';
import { labelBadge } from '../ui/components';
import { h } from '../ui/h';
import { copyPrompt } from '../ui/copy';
import type { Route } from '../ui/router';

const fmt = (iso: string): string => new Date(iso).toLocaleString('cs-CZ');
const TIMER_SECONDS = 45 * 60;
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function writingListScreen(store: Store): ReturnType<Route['render']> {
  const group = (part: number) => {
    const tasks = writingTasks.filter((t) => t.part === part);
    return h('section', { class: 'stack' }, h('h2', { lang: 'en' }, `Part ${part}`),
      tasks.length
        ? h('ul', { class: 'set-list' }, tasks.map((t) => {
            const n = store.get().writing.filter((e) => e.taskId === t.id).length;
            return h('li', { class: 'set-item' },
              h('a', { class: 'set-item__link', lang: 'en', href: `#/writing/${t.id}` }, t.title), labelBadge(t.label),
              h('span', { class: 'set-item__score' }, n ? `Pokusů: ${n}` : 'Zatím nezkoušeno'));
          }))
        : h('p', { class: 'muted' }, 'Připravujeme.'));
  };
  return { title: 'Writing', content: h('div', { class: 'stack' }, h('h1', {}, 'Writing'), group(1), group(2), h('a', { href: '#/' }, 'Domů')) };
}

export function writingScreen(store: Store, taskId: string): ReturnType<Route['render']> {
  const task = writingById(taskId);
  const reference = formatReference();
  if (!task || !reference)
    return { title: 'Nenalezeno', content: h('div', { class: 'stack' }, h('h1', {}, 'Úloha nenalezena'), h('a', { href: '#/writing' }, 'Zpět na Writing')) };
  return { title: task.title, content: taskView(store, task, reference) };
}

function taskView(store: Store, task: WritingTask, reference: FormatReference): HTMLElement {
  // Continue the newest entry without feedback (the draft); the first save otherwise creates a new one.
  let draft: WritingEntry | undefined = store.get().writing.filter((e) => e.taskId === task.id && e.feedback === null).at(-1);

  const area = h('textarea', { class: 'input', id: 'answer', rows: 14, 'aria-describedby': 'wc', lang: 'en' });
  area.value = draft?.text ?? '';
  const wc = h('p', { id: 'wc', role: 'status' });
  const warn = h('p', { class: 'notice', hidden: true });
  const saved = h('p', { class: 'muted', role: 'status' });

  const refresh = (): void => {
    const n = wordCount(area.value);
    const st = wordState(n, task.wordMin, task.wordMax);
    wc.textContent = `Počet slov: ${n} (cíl ${task.wordMin}–${task.wordMax})`;
    warn.hidden = st === 'ok' || st === 'empty';
    warn.textContent = st === 'short' ? `Text je kratší než ${task.wordMin} slov.` : st === 'long' ? `Text je delší než ${task.wordMax} slov.` : '';
  };
  const save = (): void => {
    const text = area.value;
    if (!draft && !text.trim()) return;
    const now = new Date().toISOString();
    store.update((d) => {
      if (!draft) {
        draft = { id: `w-${Date.now().toString(36)}`, taskId: task.id, text, wordCount: 0, startedAt: now, savedAt: now, feedback: null, feedbackAt: null };
        d.writing.push(draft);
      }
      draft.text = text;
      draft.wordCount = wordCount(text);
      draft.savedAt = now;
    });
    saved.textContent = `Koncept uložen ${fmt(now)}.`;
  };
  let t: ReturnType<typeof setTimeout> | undefined;
  area.addEventListener('input', () => { refresh(); clearTimeout(t); t = setTimeout(save, 500); });
  area.addEventListener('blur', () => { clearTimeout(t); save(); });
  refresh();

  // ---- optional timer ----
  const clock = h('span', { class: 'countdown', role: 'timer' }, mmss(TIMER_SECONDS));
  const timerNote = h('p', { role: 'status', class: 'muted' });
  let iv: ReturnType<typeof setInterval> | undefined;
  const timerBtn = h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => {
    if (iv) { clearInterval(iv); iv = undefined; timerBtn.textContent = 'Spustit 45min odpočet'; return; }
    let left = TIMER_SECONDS;
    clock.textContent = mmss(left);
    timerBtn.textContent = 'Zastavit odpočet';
    iv = setInterval(() => {
      if (!clock.isConnected) { clearInterval(iv); iv = undefined; return; } // screen left
      clock.textContent = mmss(--left);
      if (left <= 0) { clearInterval(iv); iv = undefined; timerNote.textContent = 'Čas vypršel.'; timerBtn.textContent = 'Spustit 45min odpočet'; }
    }, 1000);
  } }, 'Spustit 45min odpočet');

  const cp = copyPrompt(() => buildWritingPrompt(task, area.value, reference), save);

  // ---- feedback: plain text only (textContent via h(), never markup) ----
  const fbArea = h('textarea', { class: 'input', id: 'feedback', rows: 8 });
  const fbSave = h('button', { class: 'btn', type: 'button', onclick: () => {
    const text = fbArea.value.trim();
    if (!text) return;
    save();
    if (!draft) return;
    const e = draft;
    store.update(() => { e.feedback = text; e.feedbackAt = new Date().toISOString(); });
    fbArea.value = '';
    draft = undefined; // finished; further typing starts a new entry
    area.value = '';
    refresh();
    renderHistory();
  } }, 'Uložit zpětnou vazbu');

  const history = h('section', { class: 'stack' });
  function renderHistory(): void {
    const mine = store.get().writing.filter((e) => e.taskId === task.id).reverse();
    history.replaceChildren(h('h2', {}, 'Dřívější pokusy'),
      ...(mine.length ? mine.map((e) => h('details', {},
        h('summary', {}, `${fmt(e.savedAt)} – ${e.wordCount} slov${e.feedback ? ', se zpětnou vazbou' : ' (koncept)'}`),
        h('pre', { class: 'pre-wrap', lang: 'en' }, e.text),
        e.feedback ? h('div', {}, h('h3', {}, 'Zpětná vazba'), h('pre', { class: 'pre-wrap' }, e.feedback)) : null)) : [h('p', { class: 'muted' }, 'Zatím nic.')]));
  }
  renderHistory();

  return h('div', { class: 'stack' },
    h('h1', { lang: 'en' }, task.title), labelBadge(task.label),
    h('section', { class: 'stack', lang: 'en' },
      h('h2', { lang: 'cs' }, `Zadání (Part ${task.part}, ${task.taskType})`),
      h('p', {}, task.instructions),
      task.inputText ? h('blockquote', {}, task.inputText) : null,
      task.points.length ? h('ul', {}, task.points.map((p) => h('li', {}, p))) : null),
    h('details', {}, h('summary', {}, 'Plán odpovědi (nápověda)'), h('p', {}, task.modelPlanCs)),
    h('div', {}, h('label', { class: 'field-label', for: 'answer' }, 'Tvoje odpověď'), area, wc, warn, saved),
    h('div', { class: 'drill__actions' }, timerBtn, clock, cp.button),
    timerNote, ...cp.extra,
    h('section', { class: 'stack' }, h('h2', {}, 'Zpětná vazba od claude.ai'),
      h('div', {}, h('label', { class: 'field-label', for: 'feedback' }, 'Vlož zpětnou vazbu (uloží se jako prostý text)'), fbArea), fbSave),
    history,
    h('a', { href: '#/writing' }, 'Zpět na Writing'),
  );
}
