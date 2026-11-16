/**
 * `escritorinho agent …`: manage the office's agents from a terminal, through
 * the running office's API (officeRoutes.ts). This is how the reception agent
 * creates and opens the agent someone asks for.
 *
 *   escritorinho agent list
 *   escritorinho agent add --name <Name> --path <dir> [--agent-name <A>]
 *                          [--briefing <text> | --briefing-file <file>] [--launch]
 *   escritorinho agent launch --path <dir>
 *
 * The office is found in the server registry (~/.escritorinho/servers); its
 * token comes from there too, so nothing secret is typed or printed.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

import type { Directory } from '../../core/src/messages.js';
import { OFFICE_API_PREFIX } from './constants.js';
import { readRegistry } from './providers/hook/claude/hooks/serverRegistry.js';
import type { ServerConfig } from './serverConfig.js';

const USAGE = `Usage:
  escritorinho agent list
  escritorinho agent add --name <Name> --path <dir> [--agent-name <Agent name>]
                         [--briefing <text> | --briefing-file <file>] [--launch]
  escritorinho agent launch --path <dir>

Talks to the running office (start it first). "add" creates the Directory, or
updates it if one already points at <dir> (unmentioned fields are kept).`;

export class AgentCommandError extends Error {}

export interface AgentCommandArgs {
  action: 'list' | 'add' | 'launch';
  name?: string;
  path?: string;
  agentName?: string;
  briefing?: string;
  launch: boolean;
}

export function parseAgentArgs(argv: string[]): AgentCommandArgs {
  const [action, ...rest] = argv;
  if (action !== 'list' && action !== 'add' && action !== 'launch') {
    throw new AgentCommandError(USAGE);
  }
  const args: AgentCommandArgs = { action, launch: action === 'launch' };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = (): string => {
      const v = rest[++i];
      if (v === undefined) throw new AgentCommandError(`Missing value for ${flag}.\n\n${USAGE}`);
      return v;
    };
    if (flag === '--name') args.name = value();
    else if (flag === '--path')
      args.path = path.resolve(value()); // relative to here, not the office
    else if (flag === '--agent-name') args.agentName = value();
    else if (flag === '--briefing') args.briefing = value();
    else if (flag === '--briefing-file') args.briefing = fs.readFileSync(value(), 'utf8');
    else if (flag === '--launch') args.launch = true;
    else throw new AgentCommandError(`Unknown option ${flag}.\n\n${USAGE}`);
  }
  if (action !== 'list' && !args.path)
    throw new AgentCommandError(`--path is required.\n\n${USAGE}`);
  return args;
}

/** The running standalone office (the newest, if several). */
export function findOffice(): ServerConfig {
  const offices = readRegistry(() => {})
    .filter((s) => s.servesSpa)
    .sort((a, b) => b.startedAt - a.startedAt);
  if (!offices[0]) throw new AgentCommandError('No office is running. Start Escritorinho first.');
  return offices[0];
}

function request(
  office: ServerConfig,
  method: 'GET' | 'POST',
  route: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: office.port,
        path: `${OFFICE_API_PREFIX}${route}`,
        method,
        headers: {
          Authorization: `Bearer ${office.token}`,
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json: unknown = data;
          try {
            json = JSON.parse(data);
          } catch {
            // Plain text (an auth refusal): pass it on as is.
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function describe(d: Directory): string {
  const who = d.agentName ? `${d.agentName} (${d.name})` : d.name;
  return `${who}\n  ${d.path}${d.briefing ? '\n  briefing: yes' : ''}`;
}

/** Run the command; returns what to print. Throws AgentCommandError for the user's mistakes. */
export async function runAgentCommand(
  argv: string[],
  findTarget: () => ServerConfig = findOffice,
): Promise<string> {
  const args = parseAgentArgs(argv);
  const office = findTarget();
  if (args.action === 'list') {
    const { status, json } = await request(office, 'GET', '/directories');
    if (status !== 200) throw new AgentCommandError(`The office refused: ${JSON.stringify(json)}`);
    const dirs = (json as { directories: Directory[] }).directories;
    return dirs.length ? dirs.map(describe).join('\n') : 'No agents yet.';
  }
  const { status, json } = await request(office, 'POST', '/agents', {
    ...(args.name !== undefined ? { name: args.name } : {}),
    path: args.path,
    ...(args.agentName !== undefined ? { agentName: args.agentName } : {}),
    ...(args.briefing !== undefined ? { briefing: args.briefing } : {}),
    launch: args.launch,
  });
  const result = json as { directory?: Directory; launched?: boolean; error?: string };
  if (status !== 200)
    throw new AgentCommandError(result.error ?? `The office refused (${status}).`);
  const saved = result.directory ? describe({ ...result.directory, source: 'user' }) : '';
  return `${args.action === 'add' ? 'Saved' : 'Found'}: ${saved}${
    args.launch ? (result.launched ? '\nLaunched: it is at its desk now.' : '\nNot launched.') : ''
  }`;
}
