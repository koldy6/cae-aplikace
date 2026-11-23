import { h } from './h';

/** "Copy prompt" with a manual fallback (http on phones has no clipboard). `getText` is read at click time. */
export function copyPrompt(getText: () => string, beforeCopy: () => void = () => {}): { button: HTMLElement; extra: HTMLElement[] } {
  const manual = h('textarea', { class: 'input', rows: 8, readonly: true, 'aria-label': 'Prompt ke zkopírování' });
  const manualWrap = h('div', { class: 'stack', hidden: true },
    h('p', { class: 'notice', role: 'status' }, 'Automatické kopírování není dostupné. Ctrl+C / podržte a zkopírujte text níže.'), manual);
  const msg = h('p', { role: 'status' });
  const button = h('button', { class: 'btn', type: 'button', onclick: async () => {
    beforeCopy();
    const p = getText();
    msg.textContent = '';
    try {
      if (!window.isSecureContext || !navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(p);
      manualWrap.hidden = true;
      msg.textContent = 'Prompt zkopírován. Vlož ho do claude.ai.';
    } catch {
      manual.value = p;
      manualWrap.hidden = false;
      manual.focus();
      manual.select();
    }
  } }, 'Zkopírovat prompt');
  return { button, extra: [msg, manualWrap] };
}
