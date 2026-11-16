import { useSyncExternalStore } from 'react';

import { type DeskAttachment, deskAttachments, subscribeDesk } from './deskAttachments.js';

export function useDeskAttachments(agentId: number): DeskAttachment[] {
  return useSyncExternalStore(
    subscribeDesk,
    () => deskAttachments(agentId),
    () => deskAttachments(agentId),
  );
}
