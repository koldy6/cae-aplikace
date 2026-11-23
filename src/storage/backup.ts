import { z } from 'zod';
import { h } from '../ui/h';
import { AppDataSchema, type AppData, type Store } from './store';

export const BACKUP_APP_ID = 'cae-english';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const REMINDER_DAYS = 7;

export const BackupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  data: AppDataSchema,
});
export type Backup = z.infer<typeof BackupSchema>;

export interface Preview {
  sessions: number;
  attempts: number;
  writing: number;
  /** Date range (YYYY-MM-DD) of sessions, null when there are none. */
  from: string | null;
  to: string | null;
  exportedAt: string;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function buildBackup(data: AppData, now = new Date()): Backup {
  return { app: BACKUP_APP_ID, schemaVersion: 1, exportedAt: now.toISOString(), data };
}

export const backupFileName = (now = new Date()): string => `cae-english-zaloha-${now.toISOString().slice(0, 10)}.json`;

/** Validate untrusted file text. Never throws; never touches the store. */
export function parseBackup(text: string, sizeBytes = text.length): ParseResult {
  if (sizeBytes > MAX_BACKUP_BYTES) return { ok: false, error: 'Soubor je příliš velký (limit je 5 MB).' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Soubor není platný JSON. Vyberte soubor zálohy exportovaný z této aplikace.' };
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== BACKUP_APP_ID)
    return { ok: false, error: 'Soubor nepochází z aplikace CAE English.' };
  const r = BackupSchema.safeParse(json);
  if (!r.success) return { ok: false, error: 'Soubor má neplatný nebo poškozený obsah, data zůstala beze změny.' };
  return { ok: true, backup: r.data };
}

export function previewOf(b: Backup): Preview {
  const days = b.data.sessions.map((s) => s.startedAt.slice(0, 10)).sort();
  return {
    sessions: b.data.sessions.length,
    attempts: b.data.attempts.length,
    writing: b.data.writing.length,
    from: days[0] ?? null,
    to: days[days.length - 1] ?? null,
    exportedAt: b.exportedAt,
  };
}

/** True when there is data worth saving and no export in the last REMINDER_DAYS days. */
export function needsBackupReminder(data: AppData, now = new Date()): boolean {
  if (!data.sessions.length && !data.attempts.length && !data.writing.length) return false;
  const last = data.settings.lastBackupAt;
  if (!last) return true;
  const t = Date.parse(last);
  return Number.isNaN(t) || now.getTime() - t > REMINDER_DAYS * 86_400_000;
}

/** Download the current data as a JSON file and remember the export time. */
export function downloadBackup(store: Store, now = new Date()): void {
  store.update((d) => {
    d.settings.lastBackupAt = now.toISOString();
  });
  store.flush();
  const blob = new Blob([JSON.stringify(buildBackup(store.get(), now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: backupFileName(now) });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Banner shown when a backup is due; null otherwise. */
export function backupReminder(store: Store): HTMLElement | null {
  return needsBackupReminder(store.get())
    ? h('p', { class: 'notice', role: 'status' }, 'Dlouho jste nezálohovali. ', h('a', { href: '#/settings' }, 'Stáhnout zálohu'))
    : null;
}

export function backupSection(store: Store): HTMLElement {
  const status = h('p', { role: 'status' });
  const previewBox = h('div', { class: 'stack' });
  const last = store.get().settings.lastBackupAt;
  const lastInfo = h('p', { class: 'muted' }, last ? `Poslední záloha: ${last.slice(0, 10)}.` : 'Zatím jste nezálohovali.');

  const reset = (msg: string): void => {
    previewBox.replaceChildren();
    fileInput.value = '';
    status.textContent = msg;
  };

  const fileInput = h('input', {
    class: 'input',
    id: 'backup-file',
    type: 'file',
    accept: 'application/json,.json',
    onchange: () => {
      previewBox.replaceChildren();
      status.textContent = '';
      const file = fileInput.files?.[0];
      if (!file) return;
      const tooBig = parseBackup('', file.size);
      if (!tooBig.ok && file.size > MAX_BACKUP_BYTES) {
        status.textContent = tooBig.error;
        return;
      }
      file.text().then(
        (text) => {
          const r = parseBackup(text, file.size);
          if (!r.ok) {
            status.textContent = r.error;
            return;
          }
          const p = previewOf(r.backup);
          previewBox.append(
            h('p', {}, `Záloha z ${p.exportedAt.slice(0, 10)}: ${p.sessions} sezení, ${p.attempts} odpovědí, ${p.writing} textů` +
              (p.from ? `, období ${p.from} až ${p.to}.` : '.')),
            h('p', { class: 'notice' }, 'Import nahradí všechna současná data v tomto prohlížeči.'),
            h('div', { class: 'drill__actions' },
              h('button', { class: 'btn', type: 'button', onclick: () => {
                store.replace(r.backup.data);
                reset('Záloha byla obnovena.');
              } }, 'Nahradit data zálohou'),
              h('button', { class: 'btn btn--secondary', type: 'button', onclick: () => reset('Import zrušen, data zůstala beze změny.') }, 'Zrušit'),
            ),
          );
        },
        () => { status.textContent = 'Soubor se nepodařilo přečíst.'; },
      );
    },
  });

  return h('section', { class: 'stack', 'aria-labelledby': 'backup-h' },
    h('h2', { id: 'backup-h' }, 'Záloha dat'),
    h('p', {}, 'Data jsou uložena jen v tomto prohlížeči. Zálohu uložte do souboru a nahrajte ji v jiném zařízení.'),
    h('p', { class: 'notice' }, 'Nahrávky z Speaking se do zálohy nezahrnují.'),
    lastInfo,
    h('button', { class: 'btn', type: 'button', onclick: () => {
      downloadBackup(store);
      status.textContent = 'Záloha byla stažena.';
    } }, 'Stáhnout zálohu'),
    h('div', {}, h('label', { class: 'field-label', for: 'backup-file' }, 'Obnovit ze zálohy (soubor .json)'), fileInput),
    previewBox,
    status,
  );
}
