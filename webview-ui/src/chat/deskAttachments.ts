/**
 * Files dropped on an agent (its chat, its card or its character), per agent:
 * uploaded to its desk at once, then listed in its chat's composer until the
 * next message tells the agent where they are. Outside React so every drop
 * target shares one list.
 */
import { DESK_ROUTE_PREFIX } from '../constants.js';
import { serverToken } from '../transport/serverToken.js';

export interface DeskAttachment {
  key: number;
  name: string;
  status: 'uploading' | 'done' | 'error';
  /** Where the host saved it (status `done`). */
  path?: string;
}

let nextKey = 1;
const byAgent = new Map<number, DeskAttachment[]>();
const listeners = new Set<() => void>();
const EMPTY: DeskAttachment[] = [];

function emit(): void {
  for (const l of listeners) l();
}

function update(agentId: number, fn: (list: DeskAttachment[]) => DeskAttachment[]): void {
  byAgent.set(agentId, fn(byAgent.get(agentId) ?? EMPTY));
  emit();
}

export function subscribeDesk(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function deskAttachments(agentId: number): DeskAttachment[] {
  return byAgent.get(agentId) ?? EMPTY;
}

export function removeDeskAttachment(agentId: number, key: number): void {
  update(agentId, (list) => list.filter((a) => a.key !== key));
}

/** The uploaded ones, taken out of the composer (they go with this message). */
export function takeDoneAttachments(agentId: number): DeskAttachment[] {
  const done = deskAttachments(agentId).filter((a) => a.status === 'done');
  update(agentId, (list) => list.filter((a) => a.status !== 'done'));
  return done;
}

/** Whether a drag carries files (not text or a link being moved around). */
export function dragHasFiles(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes('Files');
}

/** Upload each file to the agent's desk; each shows in its composer as it goes. */
export function dropOnDesk(agentId: number, files: FileList | File[]): void {
  for (const file of Array.from(files)) {
    const key = nextKey++;
    update(agentId, (list) => [...list, { key, name: file.name, status: 'uploading' }]);
    const url = `${DESK_ROUTE_PREFIX}/${agentId}${serverToken ? `?token=${encodeURIComponent(serverToken)}` : ''}`;
    fetch(url, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name),
      },
      body: file,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const saved = (await res.json()) as { path: string; name: string };
        update(agentId, (list) =>
          list.map((a) =>
            a.key === key ? { ...a, status: 'done', path: saved.path, name: saved.name } : a,
          ),
        );
      })
      .catch(() => {
        update(agentId, (list) => list.map((a) => (a.key === key ? { ...a, status: 'error' } : a)));
      });
  }
}
