import { formatReference, speakingById, speakingSets } from '../content/loader';
import type { FormatReference, SpeakingSet } from '../content/types';
import { buildSpeakingPrompt } from '../domain/prompts';
import { checkSupport, extForMime, recButtonState, startRecording, type ActiveRecorder } from '../media/recorder';
import { deleteRecording, getRecording, putRecording } from '../storage/recordings';
import type { SpeakingEntry, Store } from '../storage/store';
import { labelBadge } from '../ui/components';
import { copyPrompt } from '../ui/copy';
import { h } from '../ui/h';
import type { Route } from '../ui/router';

type Part = 1 | 2 | 3 | 4;
const PARTS: Part[] = [1, 2, 3, 4];
const fmt = (iso: string): string => new Date(iso).toLocaleString('cs-CZ');
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function speakingListScreen(store: Store): ReturnType<Route['render']> {
  const sets = speakingSets();
  return {
    title: 'Speaking',
    content: h('div', { class: 'stack' }, h('h1', {}, 'Speaking'),
      sets.length
        ? h('ul', { class: 'set-list' }, sets.map((s) => {
            const n = store.get().speaking.filter((e) => e.setId === s.id).length;
            return h('li', { class: 'set-item' },
              h('a', { class: 'set-item__link', lang: 'en', href: `#/speaking/${s.id}` }, s.title), labelBadge(s.label),
              h('span', { class: 'set-item__score' }, n ? `Záznamů: ${n}` : 'Zatím nezkoušeno'));
          }))
        : h('p', { class: 'muted' }, 'Připravujeme.'),
      h('a', { href: '#/' }, 'Domů')),
  };
}

export function speakingSetScreen(store: Store, setId: string): ReturnType<Route['render']> {
  const set = speakingById(setId);
  const reference = formatReference();
  if (!set || !reference)
    return { title: 'Nenalezeno', content: h('div', { class: 'stack' }, h('h1', {}, 'Sada nenalezena'), h('a', { href: '#/speaking' }, 'Zpět na Speaking')) };
  return { title: set.title, content: setView(store, set, reference) };
}

/** [label, seconds] timer segments per part, from format.json `timings`. */
function segments(r: FormatReference, part: Part): [string, number][] {
  const t = r.timings;
  const pick = (label: string, key: string): [string, number][] => (typeof t[key] === 'number' ? [[label, t[key]!]] : []);
  return part === 1 ? pick('Odpovědi', 'speakingPart1Seconds')
    : part === 2 ? [...pick('Samostatný projev', 'speakingPart2LongTurnSeconds'), ...pick('Otázka pro partnera', 'speakingPart2PartnerSeconds')]
    : part === 3 ? [...pick('Diskuse', 'speakingPart3DiscussionSeconds'), ...pick('Rozhodnutí', 'speakingPart3DecisionSeconds')]
    : pick('Diskuse', 'speakingPart4Seconds');
}

function setView(store: Store, set: SpeakingSet, reference: FormatReference): HTMLElement {
  const urls: string[] = [];
  // One recorder for the whole screen: `owner` is the part that holds it (set on click, before the permission prompt resolves).
  let owner: Part | undefined;
  let rec: ActiveRecorder | undefined;
  let stopTake: (() => Promise<void>) | undefined;
  let left = false;
  const syncs: (() => void)[] = [];
  const sync = (): void => syncs.forEach((f) => f());
  // Leaving the screen: save a running take to its own part, release the object URLs.
  window.addEventListener('hashchange', () => {
    left = true;
    void stopTake?.();
    urls.forEach((u) => URL.revokeObjectURL(u));
  }, { once: true });

  const support = checkSupport();
  const mine = (part: Part): SpeakingEntry[] => store.get().speaking.filter((e) => e.setId === set.id && e.part === part);
  const li = (xs: string[]) => h('ul', {}, xs.map((x) => h('li', {}, x)));

  const promptView = (part: Part): HTMLElement =>
    part === 1 ? h('div', { lang: 'en' }, h('p', {}, 'The examiner asks you:'), li(set.part1.questions))
    : part === 2 ? h('div', { lang: 'en' }, h('p', {}, set.part2.instructions), li(set.part2.situations),
        h('p', {}, h('strong', {}, set.part2.question)), h('p', {}, `Partner's question: ${set.part2.partnerQuestion}`))
    : part === 3 ? h('div', { lang: 'en' }, h('p', {}, h('strong', {}, set.part3.question)), li(set.part3.options), h('p', {}, set.part3.decisionQuestion))
    : h('div', { lang: 'en' }, h('p', {}, 'The examiner asks you:'), li(set.part4.questions));

  const partView = (part: Part): HTMLElement => {
    // The newest entry without feedback is the one being worked on.
    let current: SpeakingEntry | undefined = mine(part).filter((e) => e.feedback === null).at(-1);
    const id = `sp${part}`;

    // ---- timer ----
    const clock = h('span', { class: 'countdown', role: 'timer' }, '0:00');
    const note = h('p', { role: 'status', class: 'muted' });
    let iv: ReturnType<typeof setInterval> | undefined;
    const stopTimer = (): void => { clearInterval(iv); iv = undefined; };
    const timerBtns = segments(reference, part).map(([label, sec]) => h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => {
      stopTimer();
      let left = sec;
      note.textContent = '';
      clock.textContent = mmss(left);
      iv = setInterval(() => {
        if (!clock.isConnected) { stopTimer(); return; }
        clock.textContent = mmss(--left);
        if (left <= 0) { stopTimer(); note.textContent = 'Čas vypršel.'; }
      }, 1000);
    } }, `Odpočet: ${label} (${mmss(sec)})`));
    timerBtns.push(h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => { stopTimer(); note.textContent = ''; } }, 'Zastavit odpočet'));

    // ---- transcript + feedback (plain text) ----
    const transcript = h('textarea', { class: 'input', id: `${id}-t`, rows: 8, lang: 'en' });
    transcript.value = current?.transcript ?? '';
    const saved = h('p', { class: 'muted', role: 'status' });
    const ensure = (d: { speaking: SpeakingEntry[] }): SpeakingEntry => {
      if (!current) {
        current = { id: `sp-${Date.now().toString(36)}-${part}`, setId: set.id, part, recordingKey: null, durationMs: 0, transcript: null, feedback: null, at: new Date().toISOString() };
        d.speaking.push(current);
      }
      return current;
    };
    const saveText = (): void => {
      const text = transcript.value;
      if (!current && !text.trim()) return;
      const had = !!current;
      let e!: SpeakingEntry;
      store.update((d) => { e = ensure(d); e.transcript = text; });
      saved.textContent = `Přepis uložen ${fmt(new Date().toISOString())}.`;
      // Never rebuild the list while typing (it would reset <audio> playback): patch the one transcript, or add the new entry.
      const el = txEls.get(e.id);
      if (el) { el.textContent = text; el.hidden = !text; } else if (!had || text) addEntry(e);
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    transcript.addEventListener('input', () => { clearTimeout(t); t = setTimeout(saveText, 500); });
    transcript.addEventListener('blur', () => { clearTimeout(t); saveText(); });

    const cp = copyPrompt(() => buildSpeakingPrompt(set, part, transcript.value, reference), saveText);

    const fbArea = h('textarea', { class: 'input', id: `${id}-f`, rows: 8 });
    const fbSave = h('button', { class: 'btn', type: 'button', onclick: () => {
      const text = fbArea.value.trim();
      if (!text) return;
      saveText();
      const e = current;
      if (!e) return;
      store.update(() => { e.feedback = text; });
      fbArea.value = '';
      transcript.value = '';
      current = undefined; // finished; further work starts a new entry
      renderHistory();
    } }, 'Uložit zpětnou vazbu');

    // ---- recording ----
    const recMsg = h('p', { role: 'alert', class: 'notice', hidden: !support }, support?.message ?? '');
    const showErr = (m: string): void => { recMsg.textContent = m; recMsg.hidden = false; };
    const recStatus = h('p', { role: 'status' });
    const syncBtn = (): void => {
      const st = recButtonState(owner, !!rec, part);
      recBtn.disabled = !!support || st === 'locked' || st === 'pending';
      recBtn.textContent = st === 'recording' ? 'Zastavit nahrávání' : 'Nahrávat';
      recStatus.textContent = st === 'recording' ? 'Nahrávám…' : st === 'pending' ? 'Čekám na mikrofon…' : st === 'locked' ? 'Nahrává se jiná část. Nejdřív ji zastav.' : '';
    };
    syncs.push(syncBtn);
    const stopAndSave = async (): Promise<void> => {
      const taken = rec!;
      rec = undefined; owner = undefined; stopTake = undefined;
      sync();
      const r = await taken.stop();
      if (!r.ok) return showErr(r.message);
      if (!current || current.recordingKey) { transcript.value = ''; current = undefined; } // a new take
      let e!: SpeakingEntry;
      store.update((d) => {
        e = ensure(d);
        e.recordingKey = e.id;
        e.durationMs = r.recording.durationMs;
        e.transcript = transcript.value || e.transcript;
      });
      if (!(await putRecording(e.id, r.recording.blob))) {
        store.update(() => { e.recordingKey = null; });
        showErr('Nahrávku se nepodařilo uložit (úložiště prohlížeče není dostupné). Přepis a ostatní funkce fungují dál.');
      }
      renderHistory();
    };
    const recBtn = h('button', { class: 'btn', type: 'button', disabled: !!support, onclick: async () => {
      if (recButtonState(owner, !!rec, part) === 'recording') return stopAndSave();
      if (owner !== undefined) return; // locked by another part, or a start is already pending
      owner = part;
      recMsg.hidden = true;
      sync();
      const r = await startRecording();
      if (!r.ok) { owner = undefined; sync(); return showErr(r.message); }
      if (left || !recBtn.isConnected) { owner = undefined; void r.recorder.stop(); return; } // user left during the prompt
      rec = r.recorder;
      stopTake = stopAndSave;
      sync();
    } }, 'Nahrávat');

    // ---- recordings list ----
    const listBox = h('div', { class: 'stack' });
    const history = h('section', { class: 'stack' }, h('h3', {}, 'Záznamy'), listBox);
    const txEls = new Map<string, HTMLElement>(); // entry id -> its transcript <pre>
    let partUrls: string[] = [];
    const empty = h('p', { class: 'muted' }, 'Zatím nic.');
    function addEntry(e: SpeakingEntry): void {
      empty.remove();
      listBox.prepend(entryView(e));
    }
    function renderHistory(): void {
      if (left) return;
      partUrls.forEach((u) => URL.revokeObjectURL(u));
      partUrls = [];
      txEls.clear();
      const list = mine(part).filter((e) => e.recordingKey || e.feedback || e.transcript).reverse();
      listBox.replaceChildren(...(list.length ? list.map(entryView) : [empty]));
    }
    function entryView(e: SpeakingEntry): HTMLElement {
          const body = h('div', { class: 'stack' });
          if (e.recordingKey) {
            const key = e.recordingKey;
            const audio = h('audio', { controls: true, preload: 'none', 'aria-label': `Nahrávka ${fmt(e.at)}` });
            const dl = h('a', { class: 'btn btn--secondary', download: `speaking-${set.id}-part${part}-${e.id}.webm`, hidden: true }, 'Stáhnout nahrávku');
            void getRecording(key).then((blob) => {
              if (!blob) { body.prepend(h('p', { class: 'muted' }, 'Nahrávka není v úložišti k dispozici.')); audio.remove(); return; }
              if (left) return;
              const u = URL.createObjectURL(blob);
              urls.push(u);
              partUrls.push(u);
              audio.src = u;
              dl.href = u;
              dl.download = `speaking-${set.id}-part${part}-${e.id}.${extForMime(blob.type)}`;
              dl.hidden = false;
            });
            body.append(audio, dl, h('button', { class: 'btn btn--secondary', type: 'button', onclick: async () => {
              if (!confirm('Smazat nahrávku? Přepis a zpětná vazba zůstanou.')) return;
              await deleteRecording(key);
              store.update(() => { e.recordingKey = null; });
              renderHistory();
            } }, 'Smazat nahrávku'));
          }
          const tx = h('pre', { class: 'pre-wrap', lang: 'en', hidden: !e.transcript }, e.transcript ?? '');
          txEls.set(e.id, tx);
          body.append(tx);
          if (e.feedback) body.append(h('h4', {}, 'Zpětná vazba'), h('pre', { class: 'pre-wrap' }, e.feedback));
          return h('details', {}, h('summary', {}, `${fmt(e.at)}${e.durationMs ? ` – ${mmss(Math.round(e.durationMs / 1000))}` : ''}${e === current ? ' (rozpracováno)' : ''}`), body);
    }
    renderHistory();

    return h('section', { class: 'stack', 'aria-labelledby': `${id}-h` },
      h('h2', { id: `${id}-h`, lang: 'en' }, `Part ${part}`),
      promptView(part),
      h('div', { class: 'drill__actions' }, timerBtns, clock), note,
      h('div', { class: 'stack' }, h('h3', {}, 'Nahrávání'), recMsg, h('div', { class: 'drill__actions' }, recBtn), recStatus),
      history,
      h('div', {}, h('label', { class: 'field-label', for: `${id}-t` }, 'Přepis: napiš, co jsi řekl/a'), transcript, saved),
      h('div', { class: 'drill__actions' }, cp.button), ...cp.extra,
      h('div', {}, h('label', { class: 'field-label', for: `${id}-f` }, 'Zpětná vazba od claude.ai (uloží se jako prostý text)'), fbArea), fbSave);
  };

  return h('div', { class: 'stack' },
    h('h1', { lang: 'en' }, set.title), labelBadge(set.label),
    h('details', {}, h('summary', {}, 'Tipy a fráze'), h('pre', { class: 'pre-wrap' }, set.tipsCs)),
    ...PARTS.map(partView),
    h('a', { href: '#/speaking' }, 'Zpět na Speaking'));
}
