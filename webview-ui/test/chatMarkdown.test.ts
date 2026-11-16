import assert from 'node:assert/strict';

import { test } from 'vitest';

import { parseInline, parseMarkdownBlocks } from '../src/chat/markdownParse.js';

test('blocks: heading, paragraph, lists, quote, fenced code, table', () => {
  const blocks = parseMarkdownBlocks(
    [
      '## Resultado',
      'Primeira linha',
      'segunda linha',
      '',
      '- item um',
      '- item dois',
      '  continua',
      '1. passo',
      '2) outro',
      '> citação',
      '```ts',
      'const a = 1;',
      '```',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
    ].join('\n'),
  );
  assert.deepEqual(blocks, [
    { kind: 'heading', level: 2, text: 'Resultado' },
    { kind: 'paragraph', text: 'Primeira linha\nsegunda linha' },
    { kind: 'list', ordered: false, items: ['item um', 'item dois continua'] },
    { kind: 'list', ordered: true, items: ['passo', 'outro'] },
    { kind: 'quote', text: 'citação' },
    { kind: 'code', text: 'const a = 1;' },
    { kind: 'table', text: '| A | B |\n|---|---|\n| 1 | 2 |' },
  ]);
});

test('an unclosed fence runs to the end instead of losing text', () => {
  assert.deepEqual(parseMarkdownBlocks('```\nx\ny'), [{ kind: 'code', text: 'x\ny' }]);
});

test('inline: bold, italic, code, links', () => {
  assert.deepEqual(parseInline('a **b** *c* `d` [e](https://x.y/z)'), [
    { kind: 'text', text: 'a ' },
    { kind: 'bold', children: [{ kind: 'text', text: 'b' }] },
    { kind: 'text', text: ' ' },
    { kind: 'italic', children: [{ kind: 'text', text: 'c' }] },
    { kind: 'text', text: ' ' },
    { kind: 'code', text: 'd' },
    { kind: 'text', text: ' ' },
    { kind: 'link', href: 'https://x.y/z', children: [{ kind: 'text', text: 'e' }] },
  ]);
});

test('no link for anything but http(s), so a reply cannot plant javascript: links', () => {
  assert.deepEqual(parseInline('[x](javascript:alert(1))'), [
    { kind: 'text', text: '[x](javascript:alert(1))' },
  ]);
});

test('snake_case names and lone asterisks stay as written', () => {
  assert.deepEqual(parseInline('use my_var_name and 2 * 3'), [
    { kind: 'text', text: 'use my_var_name and 2 * 3' },
  ]);
  assert.deepEqual(parseInline('`a*b*c`'), [{ kind: 'code', text: 'a*b*c' }]);
});
