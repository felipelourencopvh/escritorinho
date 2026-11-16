import { useSyncExternalStore } from 'react';

import { type ChatViewMode, getChatViewMode, subscribeChatViewMode } from './chatViewMode.js';

export function useChatViewMode(): ChatViewMode {
  return useSyncExternalStore(subscribeChatViewMode, getChatViewMode, getChatViewMode);
}
