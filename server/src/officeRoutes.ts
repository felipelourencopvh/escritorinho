/**
 * The office's own API, for agents and scripts on this machine (the reception
 * agent creates and opens agents through it, with `escritorinho agent …`):
 *
 *   GET  /api/office/directories          the Directories, as the launch drawer lists them
 *   POST /api/office/agents               add or update a Directory (agent name, briefing)
 *                                         and optionally launch an agent there
 *
 * Bearer-authenticated with the server token (the one in the server registry,
 * like the hook scripts), and standalone only. Everything goes through the same
 * handlers the office's own messages use, so every open office updates at once.
 */
import type { FastifyInstance } from 'fastify';
import * as fs from 'fs';

import type { AgentRuntime } from './agentRuntime.js';
import type { AgentStateStore } from './agentStateStore.js';
import { type ClientMessageContext, handleClientMessage } from './clientMessageHandler.js';
import { OFFICE_API_PREFIX } from './constants.js';
import { directoryAt, listDirectories } from './directories.js';
import type { TerminalSessions } from './terminal/terminalSessions.js';
import { bearerTokenValid } from './wsAuth.js';

export interface OfficeRouteOptions {
  token: string;
  store: AgentStateStore;
  runtime?: AgentRuntime;
  ptyManager?: TerminalSessions;
}

interface AgentRequest {
  name?: unknown;
  path?: unknown;
  agentName?: unknown;
  briefing?: unknown;
  launch?: unknown;
}

export function registerOfficeRoutes(app: FastifyInstance, options: OfficeRouteOptions): void {
  const authorized = (header: string | undefined) => bearerTokenValid(header, options.token);
  const ctx = (): ClientMessageContext => ({
    store: options.store,
    runtime: options.runtime,
    cache: null,
    privileged: true,
    ptyManager: options.ptyManager,
  });

  app.get(`${OFFICE_API_PREFIX}/directories`, async (request, reply) => {
    if (!authorized(request.headers.authorization)) return reply.code(401).send('unauthorized');
    return { directories: listDirectories([]) };
  });

  app.post<{ Body: AgentRequest }>(`${OFFICE_API_PREFIX}/agents`, async (request, reply) => {
    if (!authorized(request.headers.authorization)) return reply.code(401).send('unauthorized');
    const body = (request.body ?? {}) as AgentRequest;
    if (typeof body.path !== 'string' || !body.path.trim()) {
      return reply.code(400).send({ error: 'path is required' });
    }

    // The folder's real path: /tmp/x and /private/tmp/x (or a symlinked
    // checkout) are one folder, so one Directory, not two.
    let target = body.path;
    try {
      target = fs.realpathSync.native(body.path);
    } catch {
      // Missing: saveDirectory refuses it with its own reason.
    }
    // Updating an existing Directory keeps what the call doesn't mention
    // (its default characters, and its agent name and briefing unless given).
    const existing = directoryAt(target, []) ?? directoryAt(body.path, []);
    const replies: Array<Record<string, unknown>> = [];
    handleClientMessage(
      {
        type: 'saveDirectory',
        name: typeof body.name === 'string' ? body.name : (existing?.name ?? ''),
        path: existing?.path ?? target,
        ...(existing ? { previousPath: existing.path } : {}),
        agentName: typeof body.agentName === 'string' ? body.agentName : existing?.agentName,
        briefing: typeof body.briefing === 'string' ? body.briefing : existing?.briefing,
        characters: existing?.characters,
        characterOrder: existing?.characterOrder,
      },
      (m) => replies.push(m as Record<string, unknown>),
      ctx(),
    );
    const rejected = replies.find((m) => m.type === 'directoryRejected');
    if (rejected) return reply.code(400).send({ error: rejected.reason });
    const saved = replies.find((m) => m.type === 'directorySaved')?.directory as
      { path: string } | undefined;
    if (!saved) return reply.code(500).send({ error: 'could not save the directory' });

    let launched = false;
    if (body.launch === true) {
      if (!options.runtime || !options.ptyManager?.isAvailable()) {
        return reply
          .code(409)
          .send({ directory: saved, error: 'terminals are off on this server' });
      }
      const before = options.store.nextAgentId.current;
      handleClientMessage({ type: 'launchAgent', directoryPath: saved.path }, () => {}, ctx());
      launched = options.store.nextAgentId.current > before;
    }
    return { directory: saved, launched };
  });
}
