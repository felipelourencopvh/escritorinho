/**
 * Whether an agent's panel shows the chat or the raw terminal. One choice for
 * the whole office (desktop drawer and phone page alike), kept per browser.
 * Outside React so the phone shell can hide its terminal key bar in chat mode.
 */
import { CHAT_VIEW_MODE_STORAGE_KEY } from '../constants.js';

export type ChatViewMode = 'chat' | 'terminal';

function readStored(): ChatViewMode {
  try {
    return localStorage.getItem(CHAT_VIEW_MODE_STORAGE_KEY) === 'terminal' ? 'terminal' : 'chat';
  } catch {
    return 'chat';
  }
}

let current: ChatViewMode = readStored();
const listeners = new Set<() => void>();

export function getChatViewMode(): ChatViewMode {
  return current;
}

export function setChatViewMode(mode: ChatViewMode): void {
  if (mode === current) return;
  current = mode;
  try {
    localStorage.setItem(CHAT_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Not remembered; still switches for this visit.
  }
  for (const l of listeners) l();
}

export function subscribeChatViewMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
