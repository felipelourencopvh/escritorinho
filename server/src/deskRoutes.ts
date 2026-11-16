/**
 * The desk: files dropped on an agent in the office are saved into a folder
 * of its working directory (DESK_DIR_NAME), and the office then tells the
 * agent where they are. Standalone only, for agents this host launched.
 *
 * POST {DESK_ROUTE_PREFIX}/:agentId?token=…  body: the file's bytes,
 * header `x-file-name`: its name, URI-encoded.
 *
 * Same privilege rule as the sockets (wsAuth.standaloneHandshakeVerdict: the
 * server token AND an allowed Host), plus a same-origin check: CORS reflects
 * any origin, so without it a page elsewhere could at least try.
 */
import type { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

import type { AgentStateStore } from './agentStateStore.js';
import {
  DESK_DIR_NAME,
  DESK_MAX_FILE_BYTES,
  DESK_MAX_FILE_NAME_LENGTH,
  DESK_ROUTE_PREFIX,
} from './constants.js';
import { isAllowedWebSocketOrigin, standaloneHandshakeVerdict } from './wsAuth.js';

export interface DeskRouteOptions {
  token: string;
  allowedHostnames: ReadonlySet<string>;
  store: AgentStateStore;
}

/** A safe file name from what the browser sent: no path, no control or
 *  reserved characters, never `.`/`..`, at most DESK_MAX_FILE_NAME_LENGTH
 *  (keeping the extension). */
export function safeDeskFileName(raw: string): string {
  let name = path.basename(raw.replace(/\\/g, '/'));
  name = name
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .trim();
  if (!name) name = 'file';
  if (name.length > DESK_MAX_FILE_NAME_LENGTH) {
    const ext = path.extname(name).slice(0, 16);
    name = name.slice(0, DESK_MAX_FILE_NAME_LENGTH - ext.length) + ext;
  }
  return name;
}

/** Write `data` into `deskDir` under `name`, never over an existing file
 *  (`report (2).pdf`, …) and never through a symlink. Returns the path. */
export function writeToDesk(deskDir: string, name: string, data: Buffer): string {
  fs.mkdirSync(deskDir, { recursive: true });
  // The desk itself must be a real folder of the project, not a link elsewhere.
  if (!fs.lstatSync(deskDir).isDirectory()) throw new Error('desk is not a directory');
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let n = 1; n < 1000; n++) {
    const candidate = path.join(deskDir, n === 1 ? name : `${stem} (${n})${ext}`);
    try {
      // 'wx': fails if anything (a file or a dangling link) is already there.
      fs.writeFileSync(candidate, data, { flag: 'wx' });
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  }
  throw new Error('too many files with that name');
}

export function registerDeskRoutes(app: FastifyInstance, options: DeskRouteOptions): void {
  void app.register(async (scope) => {
    // Every type as raw bytes: the default parsers would turn a .txt or .json
    // file into a string or an object (this scope only; other routes keep them).
    scope.removeAllContentTypeParsers();
    scope.addContentTypeParser(
      '*',
      { parseAs: 'buffer', bodyLimit: DESK_MAX_FILE_BYTES },
      (_req, body, done) => done(null, body),
    );

    scope.post<{ Params: { agentId: string } }>(
      `${DESK_ROUTE_PREFIX}/:agentId`,
      {
        bodyLimit: DESK_MAX_FILE_BYTES,
        schema: {
          params: {
            type: 'object',
            properties: { agentId: { type: 'string', pattern: '^[0-9]+$' } },
            required: ['agentId'],
          },
        },
      },
      async (request, reply) => {
        const verdict = standaloneHandshakeVerdict(
          request.url,
          request.headers.host,
          options.token,
          options.allowedHostnames,
        );
        if (
          verdict !== 'privileged' ||
          !isAllowedWebSocketOrigin(request.headers.origin, request.headers.host)
        ) {
          return reply.code(401).send({ error: 'unauthorized' });
        }
        const agent = options.store.get(Number(request.params.agentId));
        if (!agent?.cwd) return reply.code(404).send({ error: 'no such agent' });
        const body = request.body;
        if (!Buffer.isBuffer(body)) return reply.code(400).send({ error: 'no file' });

        const header = request.headers['x-file-name'];
        let rawName = typeof header === 'string' ? header : '';
        try {
          rawName = decodeURIComponent(rawName);
        } catch {
          // Not URI-encoded after all: use it as sent (it is sanitized next).
        }
        try {
          const saved = writeToDesk(
            path.join(agent.cwd, DESK_DIR_NAME),
            safeDeskFileName(rawName),
            body,
          );
          return reply.send({ path: saved, name: path.basename(saved) });
        } catch (err) {
          console.error(`[Escritorinho] Desk: could not save a file for agent ${agent.id}:`, err);
          return reply.code(500).send({ error: 'could not save the file' });
        }
      },
    );
  });
}
