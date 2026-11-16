import { useT } from '../i18n/index.js';
import { setChatViewMode } from './chatViewMode.js';
import { useChatViewMode } from './useChatViewMode.js';

/** The agent panel's two views: the chat (default) and the raw terminal. */
export function ChatViewTabs({ className = '' }: { className?: string }) {
  const t = useT();
  const mode = useChatViewMode();
  const tab = (value: 'chat' | 'terminal', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setChatViewMode(value)}
      className={`text-sm py-2 px-10 border-2 rounded-none cursor-pointer ${
        mode === value
          ? 'bg-accent text-white border-accent'
          : 'bg-btn-bg text-text-muted border-transparent hover:bg-btn-hover'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label={t('chat.viewLabel')} className={`flex gap-4 ${className}`}>
      {tab('chat', t('chat.tabChat'))}
      {tab('terminal', t('chat.tabTerminal'))}
    </div>
  );
}
