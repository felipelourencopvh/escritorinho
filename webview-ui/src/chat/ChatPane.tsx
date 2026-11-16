import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { TabStatus } from '../components/AgentCard.js';
import { Button } from '../components/ui/Button.js';
import { CHAT_INPUT_MAX_LENGTH, CHAT_STICK_TO_BOTTOM_PX } from '../constants.js';
import { useT } from '../i18n/index.js';
import { useAgentChat } from './useAgentChat.js';

interface ChatPaneProps {
  agentId: number;
  /** The agent's card status: `working` shows "typing…", `attention` the approval notice. */
  status: TabStatus | null;
  /** The name the agent goes by (its Directory's agent name), if any. */
  agentName?: string;
  /** Switch this panel to the raw terminal (where approvals are answered for now). */
  onOpenTerminal: () => void;
  /** Phones: no autofocus (it would summon the keyboard over the conversation). */
  autoFocus?: boolean;
}

/**
 * The chat view of one agent: its conversation as speech bubbles, and a box
 * to write to it. Writing types the message into the agent's own terminal, so
 * the chat and the terminal are two views of one session.
 */
export function ChatPane({
  agentId,
  status,
  agentName: name,
  onOpenTerminal,
  autoFocus = true,
}: ChatPaneProps) {
  const t = useT();
  const { entries, pending, loaded, send } = useAgentChat(agentId);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const agentName = name ?? t('chat.agent');

  // Follow the conversation while the reader is at its foot; leave them alone
  // when they scrolled up to read something older.
  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < CHAT_STICK_TO_BOTTOM_PX;
  };
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [entries, pending, status]);
  useEffect(() => {
    stickRef.current = true;
  }, [agentId]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    stickRef.current = true;
    send(text);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line; never while an IME is composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    // Keep the office's own shortcuts (Esc, R, T…) out of the text box.
    e.stopPropagation();
  };

  const working = status === 'working';
  const needsApproval = status === 'attention';

  return (
    <div className="absolute inset-0 flex flex-col bg-bg" data-testid="chat-pane">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto pixel-scrollbar flex flex-col gap-8 p-10"
      >
        {loaded && entries.length === 0 && pending.length === 0 && (
          <div className="m-auto text-center text-sm text-text-muted max-w-xs">
            {t('chat.empty', { name: agentName })}
          </div>
        )}
        {entries.map((entry) => (
          <Bubble
            key={entry.uuid}
            mine={entry.role === 'user'}
            label={entry.role === 'user' ? t('chat.you') : agentName}
            text={entry.text}
          />
        ))}
        {pending.map((p) => (
          <Bubble key={`p${p.key}`} mine label={t('chat.you')} text={p.text} faded />
        ))}
        {working && (
          <div className="self-start text-sm text-text-muted italic px-4" aria-live="polite">
            {t('chat.typing', { name: agentName })}
          </div>
        )}
        {needsApproval && (
          <div
            className="self-stretch flex flex-col gap-6 p-8 border-2 border-status-permission bg-bg-dark text-sm"
            role="alert"
          >
            <span>{t('chat.needsApproval', { name: agentName })}</span>
            <Button variant="accent" size="sm" className="self-start" onClick={onOpenTerminal}>
              {t('chat.openTerminal')}
            </Button>
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-end gap-6 p-8 border-t-2 border-border bg-bg-dark">
        <textarea
          value={draft}
          rows={2}
          maxLength={CHAT_INPUT_MAX_LENGTH}
          autoFocus={autoFocus}
          placeholder={t('chat.placeholder', { name: agentName })}
          aria-label={t('chat.placeholder', { name: agentName })}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 text-sm py-4 px-6 bg-bg border-2 border-border rounded-none text-text resize-none pixel-scrollbar"
        />
        <Button variant="accent" onClick={submit} disabled={!draft.trim()}>
          {t('chat.send')}
        </Button>
      </div>
    </div>
  );
}

function Bubble({
  mine,
  label,
  text,
  faded = false,
}: {
  mine: boolean;
  label: string;
  text: string;
  faded?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 max-w-[85%] ${mine ? 'self-end items-end' : 'self-start items-start'} ${faded ? 'opacity-60' : ''}`}
      data-testid={mine ? 'chat-bubble-user' : 'chat-bubble-agent'}
    >
      <span className="text-2xs text-text-muted px-2">{label}</span>
      <div
        className={`text-sm leading-snug py-6 px-8 border-2 whitespace-pre-wrap break-words select-text ${
          mine ? 'bg-accent text-white border-accent' : 'bg-btn-bg text-text border-border'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
