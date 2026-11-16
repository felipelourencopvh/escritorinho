/**
 * Claude Code transcript records → chat lines (the office's chat view).
 *
 * Kept: prompts the user typed (`user` records whose content is text) and the
 * agent's text replies (`assistant` records' `text` blocks). Left out: tool
 * calls and results, thinking, sub-agents' records (`isSidechain`), the CLI's
 * own injected lines (`isMeta`), compaction summaries (`isCompactSummary`), slash-command echoes and local command output,
 * and every non-message record type.
 */
import type { ChatEntry } from '../../../../../core/src/messages.js';
import { isRecord } from '../../../serverConfig.js';

/** Prompts the CLI writes for slash commands and their output, not the user's words. */
const CLI_MARKUP_PREFIXES = [
  '<command-name>',
  '<command-message>',
  '<command-args>',
  '<local-command-stdout>',
  '<local-command-stderr>',
  '<local-command-caveat>',
  '<bash-input>',
  '<bash-stdout>',
  '<bash-stderr>',
  '<task-notification>',
  '<system-reminder>',
];

/** Claude Code records a multi-line paste wrapped in these tags; the chat
 *  shows what was pasted, without them. */
const PASTED_CONTENT = /<pasted_content id="[^"]*">\n?([\s\S]*?)\n?<\/pasted_content id="[^"]*">/g;

function unwrapPastes(text: string): string {
  return text.replace(PASTED_CONTENT, '$1');
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b): b is { type: 'text'; text: string } => isRecord(b) && b.type === 'text')
    .map((b) => (typeof b.text === 'string' ? b.text : ''))
    .join('\n\n');
}

export function chatEntryFromRecord(record: unknown): ChatEntry | null {
  if (!isRecord(record)) return null;
  if (record.type !== 'user' && record.type !== 'assistant') return null;
  if (record.isSidechain === true || record.isMeta === true) return null;
  // A compaction's summary is filed as a user prompt, but nobody typed it.
  if (record.isCompactSummary === true || record.isVisibleInTranscriptOnly === true) return null;
  if (typeof record.uuid !== 'string') return null;

  const message = isRecord(record.message) ? record.message : undefined;
  const content = message?.content ?? record.content;
  // A user record carrying tool results is the CLI answering a tool, not a prompt.
  if (
    record.type === 'user' &&
    Array.isArray(content) &&
    content.some((b) => isRecord(b) && b.type === 'tool_result')
  ) {
    return null;
  }

  const text = unwrapPastes(textOf(content)).trim();
  if (!text) return null;
  if (record.type === 'user' && CLI_MARKUP_PREFIXES.some((p) => text.startsWith(p))) return null;

  return {
    uuid: record.uuid,
    role: record.type,
    text,
    ...(typeof record.timestamp === 'string' ? { timestamp: record.timestamp } : {}),
  };
}
