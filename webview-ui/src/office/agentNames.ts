/**
 * The names agents go by in the office: a Directory's `agentName`, keyed by the
 * Directory's name (what each agent carries as `directoryName`). Kept outside
 * React like the office state, refreshed on every `directoriesLoaded`, and read
 * while the overlay and the cards render.
 */
import type { Directory } from '../../../core/src/messages.js';

let byDirectoryName = new Map<string, string>();

export function setDirectoryAgentNames(directories: readonly Directory[]): void {
  byDirectoryName = new Map(
    directories.filter((d) => d.agentName).map((d) => [d.name, d.agentName as string]),
  );
}

/** The agent name for an agent launched into `directoryName`, if that Directory has one. */
export function agentNameFor(directoryName: string | undefined): string | undefined {
  return directoryName ? byDirectoryName.get(directoryName) : undefined;
}
