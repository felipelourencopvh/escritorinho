import { useCallback, useEffect, useState } from 'react';

import type { TerminalPrompt } from '../../../core/src/messages.js';
import { CHAT_PROMPT_POLL_MS } from '../constants.js';
import { transport } from '../transport/index.js';

/**
 * The menu the agent's terminal is showing (a permission request, "trust this
 * folder?"), polled while the chat is open, and its answer. After an answer
 * the menu is hidden until the host reports the screen again, so a button
 * can't be pressed twice.
 */
export function useAgentPrompt(agentId: number) {
  const [prompt, setPrompt] = useState<TerminalPrompt | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);

  useEffect(() => {
    setPrompt(null);
    setAnswered(null);
    const unsubscribe = transport.onMessage((msg) => {
      if (msg.type !== 'agentPrompt' || msg.id !== agentId) return;
      setPrompt(msg.prompt ?? null);
      // The menu went away (or changed): a new one may be answered again.
      setAnswered((prev) => (msg.prompt?.question === prev ? prev : null));
    });
    const ask = () => transport.send({ type: 'requestAgentPrompt', id: agentId });
    ask();
    const timer = setInterval(ask, CHAT_PROMPT_POLL_MS);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [agentId]);

  const answer = useCallback(
    (option: number) => {
      if (!prompt) return;
      setAnswered(prompt.question);
      transport.send({
        type: 'answerAgentPrompt',
        id: agentId,
        question: prompt.question,
        option,
        label: prompt.options[option].label,
      });
    },
    [agentId, prompt],
  );

  return { prompt: prompt && answered !== prompt.question ? prompt : null, answer };
}
