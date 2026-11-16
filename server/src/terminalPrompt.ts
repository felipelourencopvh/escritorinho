/**
 * The question an agent's terminal is asking right now (a permission request,
 * "trust this folder?", any of the CLI's pick-one menus), read off the screen
 * so the chat can offer it as buttons, and answered with the keys a person
 * would press. Read from the screen, not guessed from timers: a key sent to a
 * terminal that is NOT showing a menu would act on whatever it is doing (Esc
 * interrupts a running turn), so nothing is sent unless the menu is there.
 */
import { Terminal as HeadlessTerminal } from '@xterm/headless';

import { TERMINAL_PROMPT_DETAIL_LINES, TERMINAL_PROMPT_KEY_GAP_MS } from './constants.js';
import type { TerminalSession } from './terminal/terminalSessions.js';

export interface TerminalPromptOption {
  label: string;
}

export interface TerminalPrompt {
  question: string;
  /** What it is about (the diff, the command…), as the screen shows it above the question. */
  detail?: string;
  options: TerminalPromptOption[];
  /** The option the menu's pointer is on. */
  selected: number;
  /** Options are numbered ("1. Yes"): answered with the digit, else with arrows + Enter. */
  numbered: boolean;
}

const POINTER = '❯';
/** A menu's footer: the CLI draws one under every pick-one menu, never under its input box. */
const MENU_FOOTER = /(Esc to cancel|Enter to confirm|Enter to select)/;
/** Lines that are only box drawing (separators), never content. */
const RULE = /^[\s─━╌┄┈═-]+$/;
/** How far up from the bottom a menu's footer may sit and still be the live one. */
const FOOTER_WINDOW = 6;

/** The terminal's visible screen as plain lines (no colours), from its replay. */
export async function screenLines(session: TerminalSession): Promise<string[]> {
  const replay = await session.replay();
  const term = new HeadlessTerminal({
    cols: replay.cols,
    rows: replay.rows,
    allowProposedApi: true,
    scrollback: 0,
  });
  try {
    await new Promise<void>((resolve) => term.write(replay.data, resolve));
    const buf = term.buffer.active;
    const lines: string[] = [];
    for (let i = buf.viewportY; i < buf.viewportY + term.rows; i++) {
      lines.push(buf.getLine(i)?.translateToString(true) ?? '');
    }
    return lines;
  } finally {
    term.dispose();
  }
}

/** The pick-one menu at the bottom of the screen, or null when there is none. */
export function parseTerminalPrompt(lines: string[]): TerminalPrompt | null {
  // Bottom-most footer, among the last few non-empty lines.
  const nonEmpty = lines.map((l, i) => [l, i] as const).filter(([l]) => l.trim() !== '');
  const tail = nonEmpty.slice(-FOOTER_WINDOW);
  const footer = [...tail].reverse().find(([l]) => MENU_FOOTER.test(l));
  if (!footer) return null;
  const footerAt = footer[1];

  // The pointer line nearest above the footer, and its column.
  let pointerAt = -1;
  for (let i = footerAt - 1; i >= 0; i--) {
    if (lines[i].trimStart().startsWith(POINTER)) {
      pointerAt = i;
      break;
    }
  }
  if (pointerAt < 0) return null;
  const col = lines[pointerAt].indexOf(POINTER);
  const optionIndent = col + 2;

  const isOptionStart = (line: string) =>
    line.indexOf(POINTER) === col ||
    (line.slice(0, optionIndent).trim() === '' && /\S/.test(line.charAt(optionIndent)));
  const isContinuation = (line: string) =>
    line.trim() !== '' && line.slice(0, optionIndent + 1).trim() === '';

  // Block start: walk up from the pointer over option and continuation lines.
  let start = pointerAt;
  while (start > 0 && (isOptionStart(lines[start - 1]) || isContinuation(lines[start - 1]))) {
    start--;
  }
  // A continuation can't open the block: the line above it is the question's.
  while (start < pointerAt && !isOptionStart(lines[start])) start++;

  const options: TerminalPromptOption[] = [];
  let selected = 0;
  let numbered = false;
  for (let i = start; i < footerAt; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (isOptionStart(line)) {
      let label = line.slice(col).replace(POINTER, '').trim();
      const num = /^(\d+)\.\s+(.*)$/.exec(label);
      if (num) {
        numbered = true;
        label = num[2];
      }
      if (i === pointerAt) selected = options.length;
      options.push({ label });
    } else if (isContinuation(line) && options.length) {
      options[options.length - 1].label += ` ${line.trim()}`;
    }
  }
  if (options.length < 2) return null;

  // The question: the nearest content line above the block.
  let q = start - 1;
  while (q >= 0 && (lines[q].trim() === '' || RULE.test(lines[q]))) q--;
  if (q < 0) return null;
  const question = lines[q].trim();

  // The detail: what sits above the question, up to the previous separator.
  const detailLines: string[] = [];
  for (let i = q - 1; i >= 0 && detailLines.length < TERMINAL_PROMPT_DETAIL_LINES; i--) {
    if (RULE.test(lines[i]) && lines[i].trim() !== '') {
      if (/─/.test(lines[i])) break; // a full rule closes the section; dashed ones sit inside diffs
      continue;
    }
    detailLines.unshift(lines[i].replace(/\s+$/, ''));
  }
  const detail = detailLines.join('\n').replace(/^\n+|\n+$/g, '');

  return { question, ...(detail ? { detail } : {}), options, selected, numbered };
}

/** The keys that pick `option` in `prompt`, one write each. */
export function answerKeys(prompt: TerminalPrompt, option: number): string[] {
  if (prompt.numbered && option < 9) return [String(option + 1)];
  const step = option > prompt.selected ? '\x1b[B' : '\x1b[A';
  return [...Array(Math.abs(option - prompt.selected)).fill(step), '\r'];
}

/** Press the keys for `option`, if the screen still shows this very question
 *  with that option. Returns whether anything was sent. */
export async function answerTerminalPrompt(
  session: TerminalSession,
  question: string,
  option: number,
  optionLabel: string,
): Promise<boolean> {
  const prompt = parseTerminalPrompt(await screenLines(session));
  if (!prompt || prompt.question !== question) return false;
  if (prompt.options[option]?.label !== optionLabel) return false;
  const keys = answerKeys(prompt, option);
  for (const [i, key] of keys.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, TERMINAL_PROMPT_KEY_GAP_MS));
    if (session.hasExited) return false;
    session.write(key);
  }
  return true;
}
