import {
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { TabStatus } from '../components/AgentCard.js';
import { Button } from '../components/ui/Button.js';
import { CHAT_INPUT_MAX_LENGTH, CHAT_STICK_TO_BOTTOM_PX } from '../constants.js';
import { useT } from '../i18n/index.js';
import {
  dragHasFiles,
  dropOnDesk,
  removeDeskAttachment,
  takeDoneAttachments,
} from './deskAttachments.js';
import { useAgentChat } from './useAgentChat.js';
import { useDeskAttachments } from './useDeskAttachments.js';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const attachments = useDeskAttachments(agentId);
  const uploading = attachments.some((a) => a.status === 'uploading');
  const ready = attachments.some((a) => a.status === 'done');
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

  const canSend = !uploading && (draft.trim() !== '' || ready);

  const submit = () => {
    if (!canSend) return;
    // Files on the desk go first, by full path, so the agent can open them.
    const files = takeDoneAttachments(agentId);
    const note = files.length
      ? `${t('chat.filesOnDesk')}\n${files.map((f) => `- ${f.path}`).join('\n')}`
      : '';
    const text = [note, draft.trim()].filter(Boolean).join('\n\n');
    stickRef.current = true;
    send(text);
    setDraft('');
  };

  const onDragOver = (e: DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    setDragOver(false);
    dropOnDesk(agentId, e.dataTransfer.files);
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
    <div
      className="absolute inset-0 flex flex-col bg-bg"
      data-testid="chat-pane"
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        // Only when leaving the pane, not when crossing into one of its children.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="absolute inset-4 z-20 flex items-center justify-center border-2 border-dashed border-accent bg-bg-dark/90 text-text text-sm text-center p-16 pointer-events-none">
          {t('chat.dropHere', { name: agentName })}
        </div>
      )}
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
      {attachments.length > 0 && (
        <div
          className="shrink-0 flex flex-wrap gap-4 px-8 pt-6 border-t-2 border-border bg-bg-dark"
          aria-label={t('chat.attachments')}
        >
          {attachments.map((a) => (
            <span
              key={a.key}
              title={a.status === 'error' ? t('chat.uploadFailed') : (a.path ?? a.name)}
              className={`flex items-center gap-4 text-xs py-2 pl-6 pr-2 border-2 ${
                a.status === 'error'
                  ? 'border-status-error text-status-error'
                  : 'border-border text-text'
              } ${a.status === 'uploading' ? 'opacity-60' : ''}`}
            >
              <span className="max-w-160 overflow-hidden text-ellipsis whitespace-nowrap">
                {a.name}
              </span>
              {a.status === 'uploading' && <span>{t('chat.uploading')}</span>}
              <button
                type="button"
                onClick={() => removeDeskAttachment(agentId, a.key)}
                aria-label={t('chat.removeAttachment', { name: a.name })}
                className="bg-transparent border-0 cursor-pointer text-text-muted hover:text-text px-2"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        className={`shrink-0 flex items-end gap-6 p-8 bg-bg-dark ${attachments.length ? '' : 'border-t-2 border-border'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) dropOnDesk(agentId, e.target.files);
            e.target.value = '';
          }}
        />
        <Button
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          title={t('chat.attachHint', { name: agentName })}
          aria-label={t('chat.attach')}
        >
          {t('chat.attach')}
        </Button>
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
        <Button variant="accent" onClick={submit} disabled={!canSend}>
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
      className={`flex flex-col gap-2 min-w-0 max-w-[85%] ${mine ? 'self-end items-end' : 'self-start items-start'} ${faded ? 'opacity-60' : ''}`}
      data-testid={mine ? 'chat-bubble-user' : 'chat-bubble-agent'}
    >
      <span className="text-2xs text-text-muted px-2">{label}</span>
      <div
        className={`text-sm leading-snug py-6 px-8 border-2 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] select-text ${
          mine ? 'bg-accent text-white border-accent' : 'bg-btn-bg text-text border-border'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
