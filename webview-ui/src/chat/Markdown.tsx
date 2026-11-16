/**
 * The agent's replies as light markdown: headings, paragraphs, lists, quotes,
 * fenced code, tables (kept as monospace text), and inline bold, italic, code
 * and links. Built as React elements (never as HTML), so a reply can't inject
 * markup; links open only for http(s).
 */
import type { ReactNode } from 'react';

import { type MdBlock, type MdInline, parseInline, parseMarkdownBlocks } from './markdownParse.js';

function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.kind) {
          case 'text':
            return <span key={i}>{n.text}</span>;
          case 'bold':
            return (
              <strong key={i}>
                <Inline nodes={n.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={i}>
                <Inline nodes={n.children} />
              </em>
            );
          case 'code':
            return (
              <code key={i} className="px-2 bg-bg-dark border border-border text-[0.78em]">
                {n.text}
              </code>
            );
          case 'link':
            return (
              <a
                key={i}
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-bright underline"
              >
                <Inline nodes={n.children} />
              </a>
            );
        }
      })}
    </>
  );
}

function Block({ block }: { block: MdBlock }): ReactNode {
  switch (block.kind) {
    case 'heading':
      return (
        <div className={`font-bold ${block.level <= 2 ? 'text-base' : ''}`}>
          <Inline nodes={parseInline(block.text)} />
        </div>
      );
    case 'paragraph':
      return (
        <p className="m-0">
          <Inline nodes={parseInline(block.text)} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`m-0 pl-20 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline nodes={parseInline(item)} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <div className="border-l-2 border-border pl-8 text-text-muted">
          <Inline nodes={parseInline(block.text)} />
        </div>
      );
    case 'code':
    case 'table':
      return (
        <pre className="m-0 p-6 bg-bg-dark border border-border text-[0.78em] leading-snug overflow-x-auto pixel-scrollbar whitespace-pre">
          {block.text}
        </pre>
      );
  }
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-6">
      {parseMarkdownBlocks(text).map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
