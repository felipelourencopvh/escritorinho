interface ChangelogSection {
  title: string;
  items: string[];
}

interface ChangelogContributor {
  name: string;
  url: string;
  description: string;
}

interface ChangelogEntry {
  version: string;
  sections: ChangelogSection[];
  contributors: ChangelogContributor[];
}

/** Extract "major.minor" from a semver string (e.g. "1.1.1" → "1.1") */
export function toMajorMinor(version: string): string {
  const parts = version.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version;
}

export const CHANGELOG_REPO_URL = 'https://github.com/felipelourencopvh/escritorinho';

/** The project Escritorinho is built on (MIT), credited in every release. */
export const UPSTREAM_REPO_URL = 'https://github.com/pixel-agents-hq/pixel-agents';

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '0.1',
    sections: [
      {
        title: 'Features',
        items: [
          'English and Brazilian Portuguese, switched any time in Settings',
          'Named agents: give each folder an agent name and a briefing (its role, where its notes are)',
          'Chat with your agents in speech bubbles; the terminal is one tab away',
          'Hand files to an agent: drop them on its chat, card or character and they land on its desk',
          "Answer an agent's questions and permission requests from the chat, as buttons",
          'Replies shown as light markdown',
          'No "skip permissions" mode: every agent asks before acting',
        ],
      },
      {
        title: 'Built on Pixel Agents',
        items: [
          'Escritorinho is a fork of Pixel Agents (MIT) by Pablo De Lucca and its contributors: the office, the characters and the agent tracking are their work.',
        ],
      },
    ],
    contributors: [
      {
        name: 'Pixel Agents',
        url: UPSTREAM_REPO_URL,
        description: 'The original project, by @pablodelucca and its contributors',
      },
    ],
  },
];
