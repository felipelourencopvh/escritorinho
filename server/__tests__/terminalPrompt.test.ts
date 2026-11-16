import { describe, expect, it } from 'vitest';

import { answerKeys, parseTerminalPrompt } from '../src/terminalPrompt.js';

// Screens as Claude Code v2.1.325 drew them (captured in a PTY, 100 columns).
const WRITE_PROMPT = `
▗ ▗   ▖ ▖  Claude Code v2.1.325
❯ Create a file named hello.txt containing the word hi. Do not do anything else.
⏺ Write(hello.txt)
────────────────────────────────────────────────────────────────────────────────────────────────────
 Create file
 hello.txt
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
  1 hi
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Do you want to create hello.txt?
 ❯ 1. Yes
   2. Yes, and switch to accept edits (auto-approve file edits and common file commands) for this
      session (shift+tab)
   3. No

 Esc to cancel · Tab to amend
`.split('\n');

const TRUST_PROMPT = `
────────────────────────────────────────────────────────────────────────────────────────────────────
 Accessing workspace:
 /tmp/project
 Quick safety check: Is this a project you created or one you trust? (Like your own code, a
 well-known open source project, or work from your team). If not, take a moment to review what's in
 this folder first.
 Claude Code'll be able to read, edit, and execute files here.
 Security guide
 ❯ No, exit
   Yes, I trust this folder
 Enter to confirm · Esc to cancel
`.split('\n');

const IDLE_INPUT = `
⏺ I created hello.txt in the working directory. It contains the word hi.
✻ Crunched for 5s · done 10:12
────────────────────────────────────────────────────────────────────────────────────────────────────
❯
────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏸ manual mode on · ← for agents
`.split('\n');

describe('parseTerminalPrompt', () => {
  it('reads a numbered permission menu, its question and what it is about', () => {
    expect(parseTerminalPrompt(WRITE_PROMPT)).toEqual({
      question: 'Do you want to create hello.txt?',
      detail: ' Create file\n hello.txt\n  1 hi',
      options: [
        { label: 'Yes' },
        {
          label:
            'Yes, and switch to accept edits (auto-approve file edits and common file commands) for this session (shift+tab)',
        },
        { label: 'No' },
      ],
      selected: 0,
      numbered: true,
    });
  });

  it('reads an unnumbered arrow menu', () => {
    const prompt = parseTerminalPrompt(TRUST_PROMPT);
    expect(prompt?.options).toEqual([{ label: 'No, exit' }, { label: 'Yes, I trust this folder' }]);
    expect(prompt?.selected).toBe(0);
    expect(prompt?.numbered).toBe(false);
  });

  it('sees no menu at the input box, however the pointer is drawn', () => {
    expect(parseTerminalPrompt(IDLE_INPUT)).toBeNull();
  });

  it('ignores a menu that scrolled up out of the live bottom of the screen', () => {
    const stale = [...WRITE_PROMPT, ...IDLE_INPUT, '', 'more output', 'and more', 'and more'];
    expect(parseTerminalPrompt(stale)).toBeNull();
  });

  it('needs at least two options', () => {
    expect(parseTerminalPrompt([' Proceed?', ' ❯ 1. Yes', ' Esc to cancel'])).toBeNull();
  });
});

describe('answerKeys', () => {
  it('presses the digit of a numbered option', () => {
    const prompt = parseTerminalPrompt(WRITE_PROMPT)!;
    expect(answerKeys(prompt, 0)).toEqual(['1']);
    expect(answerKeys(prompt, 2)).toEqual(['3']);
  });

  it('moves the pointer with arrows, then Enter, in an unnumbered menu', () => {
    const prompt = parseTerminalPrompt(TRUST_PROMPT)!;
    expect(answerKeys(prompt, 1)).toEqual(['\x1b[B', '\r']);
    expect(answerKeys(prompt, 0)).toEqual(['\r']);
    expect(answerKeys({ ...prompt, selected: 1 }, 0)).toEqual(['\x1b[A', '\r']);
  });
});
