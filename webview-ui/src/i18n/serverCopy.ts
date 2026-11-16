/**
 * The server ships its consent and usage disclosures in English, as the ONE
 * copy of those terms (server/src/providers/hook/claude/consentCopy.ts,
 * claudeUsageBridge.ts). Here each paragraph is recognized and translated
 * with the values it carries (event count, file names). A paragraph that no
 * pattern recognizes is shown in English as sent: a translation can lag
 * behind the server's wording, but it can never state weaker terms.
 */
import type { MessageKey } from './en.js';
import { getLocale, type Locale, t } from './index.js';

interface Pattern {
  re: RegExp;
  key: MessageKey;
  /** Names for the capture groups, in order. */
  vars: string[];
}

const PATTERNS: Pattern[] = [
  {
    re: /^To bring your agents to life in real time, .+? adds hooks for (\d+) Claude Code events to (\S+)\. Note that your existing settings are kept, and a one-time backup is saved as (\S+)\.$/,
    key: 'consent.factWhat',
    vars: ['count', 'file', 'backup'],
  },
  {
    re: /^Claude Code will send those events - including tool names and tool inputs - to a .+? server on this machine\. Everything stays local - the server listens only on 127\.0\.0\.1 - unless you explicitly start it with --host to expose it on your network\.$/,
    key: 'consent.factData',
    vars: [],
  },
  {
    re: /^You can remove the hooks at any time from Settings → Instant Detection \(Hooks\)\.$/,
    key: 'consent.factUndo',
    vars: [],
  },
  { re: /^One more thing: hooks!$/, key: 'consent.headline', vars: [] },
  {
    re: /^To show your remaining weekly and 5-hour usage in the top-left corner, .+? wraps your status line in (\S+)\. It keeps working and looks the same \(with no status line, Claude Code hides some footer hints\)\. A one-time backup is saved as (\S+)\.$/,
    key: 'usage.factWhat',
    vars: ['file', 'backup'],
  },
  {
    re: /^Only your usage percentages and reset times, and each session's context percentage, are sent, to the .+? server on this machine\.$/,
    key: 'usage.factData',
    vars: [],
  },
  {
    re: /^You can turn this off at any time from Settings → Usage Bars\.$/,
    key: 'usage.factUndo',
    vars: [],
  },
];

export function translateServerText(text: string, locale: Locale = getLocale()): string {
  if (locale === 'en') return text;
  for (const { re, key, vars } of PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const values: Record<string, string> = {};
    vars.forEach((name, i) => (values[name] = m[i + 1]));
    return t(key, values, locale);
  }
  return text;
}

/** A disclosure block: paragraphs separated by blank lines, each translated. */
export function translateDisclosure(block: string, locale: Locale = getLocale()): string[] {
  return block.split('\n\n').map((p) => translateServerText(p, locale));
}
