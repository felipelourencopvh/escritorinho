import { useCallback, useEffect, useState } from 'react';

import type { ChatEntry } from '../../../core/src/messages.js';
import { transport } from '../transport/index.js';

/** A message sent from the chat that the transcript hasn't echoed back yet. */
export interface PendingChat {
  key: number;
  text: string;
}

let nextPendingKey = 1;

/** Compared ignoring whitespace runs: the CLI may re-wrap what it records. */
const sameText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * One agent's conversation for the chat view: the history the host sends on
 * request, then every new line it broadcasts, deduped by uuid. A sent message
 * shows at once as pending and is dropped when the transcript records it.
 */
export function useAgentChat(agentId: number | null) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState<PendingChat[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries([]);
    setPending([]);
    setLoaded(false);
    if (agentId === null) return;

    const add = (incoming: ChatEntry[]) => {
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.uuid));
        const fresh = incoming.filter((e) => !seen.has(e.uuid));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      // The transcript now holds what was typed: the pending copy can go.
      const typed = incoming.filter((e) => e.role === 'user').map((e) => sameText(e.text));
      if (typed.length) {
        setPending((prev) => prev.filter((p) => !typed.includes(sameText(p.text))));
      }
    };

    const unsubscribe = transport.onMessage((msg) => {
      if (msg.type === 'agentChatHistory' && msg.id === agentId) {
        add(msg.entries);
        setLoaded(true);
      } else if (msg.type === 'agentChatMessage' && msg.id === agentId) {
        add([msg.entry]);
      }
    });
    transport.send({ type: 'requestAgentChat', id: agentId });
    return unsubscribe;
  }, [agentId]);

  const send = useCallback(
    (text: string) => {
      if (agentId === null || !text.trim()) return;
      setPending((prev) => [...prev, { key: nextPendingKey++, text }]);
      transport.send({ type: 'sendAgentChat', id: agentId, text });
    },
    [agentId],
  );

  return { entries, pending, loaded, send };
}
