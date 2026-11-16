/** Light markdown → a block/inline tree (pure; the chat's Markdown renders it). */

export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'bold' | 'italic'; children: MdInline[] }
  | { kind: 'link'; href: string; children: MdInline[] };

export type MdBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; text: string };

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;

export function parseMarkdownBlocks(text: string): MdBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++]);
      i++; // the closing fence (or the end)
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (TABLE_ROW.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(lines[i++].trim());
      blocks.push({ kind: 'table', text: rows.join('\n') });
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = !BULLET.test(line);
      const re = ordered ? ORDERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const m = re.exec(lines[i]);
        if (m) {
          items.push(m[1]);
        } else if (lines[i].trim() !== '' && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${lines[i].trim()}`; // a wrapped item
        } else {
          break;
        }
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(QUOTE.exec(lines[i++])![1]);
      blocks.push({ kind: 'quote', text: body.join(' ') });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !FENCE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !TABLE_ROW.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !QUOTE.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: 'paragraph', text: para.join('\n') });
  }
  return blocks;
}

const SAFE_HREF = /^https?:\/\//i;

/** Inline spans: `code`, **bold**, *italic* / _italic_, [text](http…). */
export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  let plain = '';
  const flush = () => {
    if (plain) out.push({ kind: 'text', text: plain });
    plain = '';
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^`([^`\n]+)`/.exec(rest))) {
      flush();
      out.push({ kind: 'code', text: m[1] });
    } else if (
      (m = /^\*\*(?=\S)([\s\S]+?)\*\*/.exec(rest)) ||
      (m = /^__(?=\S)([\s\S]+?)__/.exec(rest))
    ) {
      flush();
      out.push({ kind: 'bold', children: parseInline(m[1]) });
    } else if (
      (m = /^\*(?=[^\s*])([^*\n]+?)\*/.exec(rest)) ||
      // _x_ only at a word boundary, so snake_case names stay as written.
      ((i === 0 || /\W/.test(text[i - 1])) && (m = /^_(?=\S)([^_\n]+?)_(?!\w)/.exec(rest)))
    ) {
      flush();
      out.push({ kind: 'italic', children: parseInline(m[1]) });
    } else if ((m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest)) && SAFE_HREF.test(m[2])) {
      flush();
      out.push({ kind: 'link', href: m[2], children: parseInline(m[1]) });
    } else {
      plain += text[i];
      i++;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}
