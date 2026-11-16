import type { MouseEvent as ReactMouseEvent } from 'react';

import { ChatPane } from '../chat/ChatPane.js';
import { setChatViewMode } from '../chat/chatViewMode.js';
import { ChatViewTabs } from '../chat/ChatViewTabs.js';
import { useChatViewMode } from '../chat/useChatViewMode.js';
import { SIDE_PANEL_CONTENT_SHIFT_PX, TERMINAL_DRAWER_RESIZE_HANDLE_PX } from '../constants.js';
import { useSlidePanel } from '../hooks/useSlidePanel.js';
import { useT } from '../i18n/index.js';
import type { TerminalConnectionStatus } from '../terminal/terminalClient.js';
import type { AgentAppearance, TabStatus } from './AgentCard.js';
import { TerminalPaneStack } from './TerminalPaneStack.js';

interface TerminalDrawerProps {
  /** Agent ids with a live PTY, in open order. */
  agentIds: number[];
  /** The pane showing (useTerminalDrawer's resolution). */
  shownAgentId: number | null;
  isOpen: boolean;
  /** Open width in px (user-resizable). Ignored while collapsed. */
  widthPx: number;
  /** Mousedown on the left-edge drag handle; App owns the resize gesture. */
  onResizeStart: (e: ReactMouseEvent) => void;
  onStatusChange: (agentId: number, status: TerminalConnectionStatus | null) => void;
  /** The shown agent's card status and name, for the chat view. */
  statusFor: (agentId: number) => TabStatus | null;
  getAppearance: (agentId: number) => AgentAppearance;
}

/**
 * Right-docked panel hosting one xterm tab per launched agent.
 *
 * Standalone only — App gates rendering on terminalAvailable, which the server
 * only ever reports over the WebSocket transport. VS Code keeps using its own
 * terminal panel.
 *
 * App draws the agent-card bar (AgentCardBar) just before it, over the
 * office's right edge; the panel opens to the bar's right. The cards double as
 * its tabs — clicking one selects that agent's pane — so the panel itself is
 * pure terminal with no chrome of its own beyond the resize handle; the
 * ribbon that hides it is the card bar's last item (TerminalHideRibbon).
 */
export function TerminalDrawer({
  agentIds,
  shownAgentId,
  isOpen,
  widthPx,
  onResizeStart,
  onStatusChange,
  statusFor,
  getAppearance,
}: TerminalDrawerProps) {
  const chatMode = useChatViewMode();
  // `rendered` keeps the panes laid out (display:none once shut — never
  // unmounted: that would drop each xterm's scrollback and force a reconnect
  // on every toggle); `shown` is the width target.
  const t = useT();
  const { rendered, shown, panelTransition, contentTransition, onPanelTransitionEnd } =
    useSlidePanel(isOpen);

  if (agentIds.length === 0) return null;

  return (
    // Opens to the right of the card bar (whose last item is the hide
    // ribbon, TerminalHideRibbon). The inner box animates its width and clips, with the panel pinned to its
    // left at its full width, so the panel slides out from behind the right
    // edge without the terminal re-fitting every frame. The overshoot shows
    // as a little more of the panel's background.
    <div className={`h-full shrink-0 ${rendered ? 'flex' : 'hidden'}`}>
      <div
        className="h-full flex justify-start overflow-hidden bg-bg border-l-2 border-border"
        style={{ width: shown ? widthPx : 0, transition: panelTransition }}
        onTransitionEnd={onPanelTransitionEnd}
      >
        <div
          className="relative h-full shrink-0 flex flex-col"
          style={{
            // The clip box's 2px border is inside widthPx.
            width: widthPx - 2,
            transform: shown ? 'none' : `translateX(${SIDE_PANEL_CONTENT_SHIFT_PX}px)`,
            opacity: shown ? 1 : 0,
            transition: contentTransition,
          }}
        >
          {/* Drag handle over the left edge. App owns the gesture so it can
              resize the office region in lockstep. */}
          <div
            className="absolute top-0 left-0 bottom-0 z-40 cursor-col-resize hover:bg-accent"
            style={{ width: TERMINAL_DRAWER_RESIZE_HANDLE_PX }}
            onMouseDown={onResizeStart}
            title={t('terminal.dragResize')}
          />

          <ChatViewTabs className="shrink-0 pt-6 pb-2 pl-12 pr-6" />
          <div className="relative flex-1 min-h-0 p-4">
            <TerminalPaneStack
              agentIds={agentIds}
              shownAgentId={shownAgentId}
              onStatusChange={onStatusChange}
              paneClassName="inset-4"
              keepHidden
            />
            {/* Over the terminal, never instead of it: the panes stay laid
                out (and connected) underneath, so switching views is instant. */}
            {chatMode === 'chat' && shownAgentId !== null && (
              <ChatPane
                agentId={shownAgentId}
                status={statusFor(shownAgentId)}
                agentName={getAppearance(shownAgentId).name}
                onOpenTerminal={() => setChatViewMode('terminal')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
