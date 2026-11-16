import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readChatHistory, writeChatToTerminal } from '../src/agentChat.js';
import { CHAT_SUBMIT_DELAY_MS } from '../src/constants.js';
import { chatEntryFromRecord } from '../src/providers/hook/claude/chatEntries.js';
import type { TerminalSession } from '../src/terminal/terminalSessions.js';

const provider = { chatEntryFromRecord };

describe('chatEntryFromRecord (Claude)', () => {
  it('keeps a typed prompt and a text reply', () => {
    expect(
      chatEntryFromRecord({
        type: 'user',
        uuid: 'u1',
        timestamp: '2026-11-16T10:00:00Z',
        message: { role: 'user', content: '  Analyze the tender  ' },
      }),
    ).toEqual({
      uuid: 'u1',
      role: 'user',
      text: 'Analyze the tender',
      timestamp: '2026-11-16T10:00:00Z',
    });
    expect(
      chatEntryFromRecord({
        type: 'assistant',
        uuid: 'a1',
        message: { content: [{ type: 'text', text: 'Done.' }] },
      }),
    ).toEqual({ uuid: 'a1', role: 'assistant', text: 'Done.' });
  });

  it('joins the text blocks of a prompt sent with attachments', () => {
    const entry = chatEntryFromRecord({
      type: 'user',
      uuid: 'u2',
      message: {
        content: [
          { type: 'text', text: 'Look at this' },
          { type: 'image', source: {} },
          { type: 'text', text: 'and this' },
        ],
      },
    });
    expect(entry?.text).toBe('Look at this\n\nand this');
  });

  it('leaves out tools, thinking, sub-agents, CLI lines and other records', () => {
    const skipped = [
      { type: 'assistant', uuid: 'a', message: { content: [{ type: 'tool_use', name: 'Read' }] } },
      { type: 'assistant', uuid: 'a', message: { content: [{ type: 'thinking', thinking: 'x' }] } },
      { type: 'user', uuid: 'u', message: { content: [{ type: 'tool_result', content: 'x' }] } },
      { type: 'user', uuid: 'u', isSidechain: true, message: { content: 'sub-agent prompt' } },
      { type: 'user', uuid: 'u', isMeta: true, message: { content: 'Caveat: …' } },
      { type: 'user', uuid: 'u', message: { content: '<command-name>/clear</command-name>' } },
      {
        type: 'user',
        uuid: 'u',
        message: { content: '<local-command-stdout>ok</local-command-stdout>' },
      },
      { type: 'user', message: { content: 'no uuid' } },
      { type: 'user', uuid: 'u', message: { content: '   ' } },
      { type: 'ai-title', uuid: 't', aiTitle: 'Title' },
      'not an object',
      null,
    ];
    for (const record of skipped) expect(chatEntryFromRecord(record)).toBeNull();
  });
});

describe('readChatHistory', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-chat-test-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const line = (type: string, uuid: string, content: unknown) =>
    JSON.stringify({ type, uuid, message: { content } }) + '\n';

  it('returns the conversation oldest first, skipping malformed lines', () => {
    const file = path.join(dir, 's.jsonl');
    fs.writeFileSync(
      file,
      line('user', 'u1', 'Hi') +
        '{"half a line\n' +
        line('assistant', 'a1', [{ type: 'tool_use' }]) +
        line('assistant', 'a2', [{ type: 'text', text: 'Hello' }]),
    );
    expect(readChatHistory(file, provider).map((e) => [e.role, e.text])).toEqual([
      ['user', 'Hi'],
      ['assistant', 'Hello'],
    ]);
  });

  it('keeps only the last `limit` entries', () => {
    const file = path.join(dir, 's.jsonl');
    fs.writeFileSync(file, ['1', '2', '3', '4'].map((n) => line('user', n, `m${n}`)).join(''));
    expect(readChatHistory(file, provider, 2).map((e) => e.text)).toEqual(['m3', 'm4']);
  });

  it('is empty for a missing file or a provider with no chat view', () => {
    expect(readChatHistory(path.join(dir, 'nope.jsonl'), provider)).toEqual([]);
    const file = path.join(dir, 's.jsonl');
    fs.writeFileSync(file, line('user', 'u1', 'Hi'));
    expect(readChatHistory(file, {})).toEqual([]);
  });
});

describe('writeChatToTerminal', () => {
  afterEach(() => vi.useRealTimers());

  function fakeSession(hasExited = false) {
    const writes: string[] = [];
    const session = {
      hasExited,
      write: (d: string) => writes.push(d),
    } as unknown as TerminalSession;
    return { session, writes };
  }

  it('pastes the message as one bracketed paste, then presses Enter', () => {
    vi.useFakeTimers();
    const { session, writes } = fakeSession();
    writeChatToTerminal(session, 'line one\nline two');
    expect(writes).toEqual(['\x1b[200~line one\nline two\x1b[201~']);
    vi.advanceTimersByTime(CHAT_SUBMIT_DELAY_MS);
    expect(writes).toEqual(['\x1b[200~line one\nline two\x1b[201~', '\r']);
  });

  it('strips paste markers inside the text, so nothing runs as keystrokes', () => {
    vi.useFakeTimers();
    const { session, writes } = fakeSession();
    writeChatToTerminal(session, 'a\x1b[201~rm -rf\x1b[200~b');
    expect(writes[0]).toBe('\x1b[200~arm -rfb\x1b[201~');
  });

  it('skips the Enter when the terminal exited meanwhile', () => {
    vi.useFakeTimers();
    const { session, writes } = fakeSession();
    writeChatToTerminal(session, 'hi');
    (session as { hasExited: boolean }).hasExited = true;
    vi.advanceTimersByTime(CHAT_SUBMIT_DELAY_MS);
    expect(writes).toHaveLength(1);
  });
});
