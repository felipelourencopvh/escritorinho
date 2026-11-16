/**
 * Claude Code transcript records → chat lines (the office's chat view).
 *
 * Kept: prompts the user typed (`user` records whose content is text) and the
 * agent's text replies (`assistant` records' `text` blocks). Left out: tool
 * calls and results, thinking, sub-agents' records (`isSidechain`), the CLI's
 * own injected lines (`isMeta`), slash-command echoes and local command output,
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

  const text = textOf(content).trim();
  if (!text) return null;
  if (record.type === 'user' && CLI_MARKUP_PREFIXES.some((p) => text.startsWith(p))) return null;

  return {
    uuid: record.uuid,
    role: record.type,
    text,
    ...(typeof record.timestamp === 'string' ? { timestamp: record.timestamp } : {}),
  };
}
