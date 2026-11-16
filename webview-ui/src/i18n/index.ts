/**
 * Interface language (English by default, Brazilian Portuguese on request).
 *
 * `en.ts` is the source of every key; `ptBR.ts` is typed against it, so a
 * missing translation is a compile error, never a half-translated screen.
 * The choice is per browser (localStorage), like the radio's volume.
 *
 * Components read strings with `useT()` (re-renders on a language change,
 * memoized components included, through the context). Plain helpers called
 * during render may use the module-level `t()`.
 */
import { createContext, useContext } from 'react';

import { en, type MessageKey } from './en.js';
import { ptBR } from './ptBR.js';

export type { MessageKey };

/** The product's name, filled into every `{app}` placeholder. */
export const APP_NAME = 'Escritorinho';

export const LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

/** Each language named in itself, as a picker shows it. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, 'pt-BR': ptBR };

const LOCALE_STORAGE_KEY = 'escritorinho.locale';

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && (LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  } catch {
    // Private window or blocked storage: fall back to the default.
  }
  return 'en';
}

let current: Locale = readStoredLocale();
const listeners = new Set<() => void>();

function applyDocumentLang(locale: Locale): void {
  // globalThis: this module also runs in Node (webview unit tests), with no DOM types.
  const doc = (globalThis as { document?: { documentElement: { lang: string } } }).document;
  if (doc) doc.documentElement.lang = locale;
}
applyDocumentLang(current);

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Not persisted; still switches for this visit.
  }
  applyDocumentLang(locale);
  for (const l of listeners) l();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars): string {
  const all: Vars = { app: APP_NAME, ...vars };
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in all ? String(all[name]) : whole,
  );
}

/** Translate in the current language. `{name}` placeholders take `vars`. */
export function t(key: MessageKey, vars?: Vars, locale: Locale = current): string {
  return format(DICTIONARIES[locale][key] ?? en[key], vars);
}

export type Translate = (key: MessageKey, vars?: Vars) => string;

/** Provided once by LocaleProvider (main.tsx). */
export const LocaleContext = createContext<Locale>(current);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useContext(LocaleContext);
  return (key, vars) => t(key, vars, locale);
}

// ── Agent status lines ───────────────────────────────────────
// The server writes them in English and the office also reads them as
// signals ("Subtask:" marks a sub-agent), so they stay English on the wire
// and are translated only where they are shown.

const STATUS_PREFIXES: ReadonlyArray<[string, MessageKey]> = [
  ['Reading ', 'status.reading'],
  ['Editing notebook', 'status.editingNotebook'],
  ['Editing ', 'status.editing'],
  ['Writing ', 'status.writing'],
  ['Running: ', 'status.running'],
  ['Subtask: ', 'status.subtask'],
  ['Creating team: ', 'status.creatingTeamNamed'],
  ['Using ', 'status.using'],
];

const STATUS_EXACT: Readonly<Record<string, MessageKey>> = {
  'Searching files': 'status.searchingFiles',
  'Searching code': 'status.searchingCode',
  'Fetching web content': 'status.fetchingWeb',
  'Searching the web': 'status.searchingWeb',
  'Waiting for your answer': 'status.waitingAnswer',
  Planning: 'status.planning',
  'Editing notebook': 'status.editingNotebook',
  'Creating team': 'status.creatingTeam',
  'Sending message': 'status.sendingMessage',
  'Running subtask': 'status.runningSubtask',
  Idle: 'status.idle',
  'Needs approval': 'status.needsApproval',
  'Might be waiting for input': 'status.mightBeWaiting',
  'Waiting for input': 'status.waitingForInput',
  Subtask: 'status.subtaskPlain',
};

export function translateStatus(text: string, locale: Locale = current): string {
  if (locale === 'en') return text;
  const exact = STATUS_EXACT[text];
  if (exact) return t(exact, undefined, locale);
  for (const [prefix, key] of STATUS_PREFIXES) {
    if (text.startsWith(prefix) && prefix.endsWith(' ')) {
      return t(key, { value: text.slice(prefix.length) }, locale);
    }
  }
  return text;
}
