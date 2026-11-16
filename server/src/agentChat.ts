/**
 * The office's chat view of an agent: its conversation read from the
 * transcript (through the provider's `chatEntryFromRecord`), and messages
 * typed into the agent's own terminal, as if the user had typed them there.
 * The chat is a second view of the same session, never a second agent.
 */
import * as fs from 'fs';

import type { ChatEntry } from '../../core/src/messages.js';
import type { HookProvider } from '../../core/src/provider.js';
import {
  CHAT_HISTORY_MAX_ENTRIES,
  CHAT_HISTORY_TAIL_BYTES,
  CHAT_SUBMIT_DELAY_MS,
} from './constants.js';
import type { TerminalSession } from './terminal/terminalSessions.js';

/** The last `limit` chat entries of a transcript, oldest first. Reads only the
 *  file's tail, so a long session costs the same as a short one. */
export function readChatHistory(
  jsonlFile: string,
  provider: Pick<HookProvider, 'chatEntryFromRecord'>,
  limit = CHAT_HISTORY_MAX_ENTRIES,
): ChatEntry[] {
  if (!provider.chatEntryFromRecord) return [];
  let text: string;
  try {
    const size = fs.statSync(jsonlFile).size;
    const start = Math.max(0, size - CHAT_HISTORY_TAIL_BYTES);
    const fd = fs.openSync(jsonlFile, 'r');
    try {
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      text = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
    // A tail read starts mid-line: drop the partial first line.
    if (start > 0) text = text.slice(text.indexOf('\n') + 1);
  } catch {
    return [];
  }
  const entries: ChatEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = provider.chatEntryFromRecord(JSON.parse(line));
      if (entry) entries.push(entry);
    } catch {
      // A malformed or half-written line: skip it, like the transcript parser.
    }
  }
  return entries.slice(-limit);
}

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

/**
 * Type `text` into an agent's terminal and submit it. Sent as a bracketed
 * paste, so line breaks stay inside the one message instead of each one
 * submitting, then Enter after a short pause (a TUI that times keystrokes to
 * tell a paste from typing would otherwise take the Enter as part of it).
 */
export function writeChatToTerminal(session: TerminalSession, text: string): void {
  // The paste markers themselves must not appear inside: that would end the
  // paste early and run the rest as keystrokes.
  const clean = text.split(PASTE_START).join('').split(PASTE_END).join('');
  session.write(PASTE_START + clean + PASTE_END);
  setTimeout(() => {
    if (!session.hasExited) session.write('\r');
  }, CHAT_SUBMIT_DELAY_MS);
}
