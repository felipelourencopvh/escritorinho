import Fastify, { type FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentCommandError, parseAgentArgs } from '../src/agentCommand.js';
import { AgentStateStore } from '../src/agentStateStore.js';
import { readConfig } from '../src/configPersistence.js';
import { registerOfficeRoutes } from '../src/officeRoutes.js';

const TOKEN = 'office-token';

describe('office API', () => {
  let app: FastifyInstance;
  let store: AgentStateStore;
  let project: string;
  let broadcasts: Array<Record<string, unknown>>;

  let home: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    // A fresh $HOME per test, so each starts with an empty config.json.
    originalHome = process.env.HOME;
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-office-home-'));
    process.env.HOME = home;
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-office-project-'));
    store = new AgentStateStore();
    broadcasts = [];
    store.on('broadcast', (m) => broadcasts.push(m));
    app = Fastify();
    registerOfficeRoutes(app, { token: TOKEN, store });
    await app.ready();
  });
  afterEach(async () => {
    await app.close();
    store.dispose();
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
    process.env.HOME = originalHome;
  });

  const post = (body: unknown, token = TOKEN) =>
    app.inject({
      method: 'POST',
      url: '/api/office/agents',
      headers: { authorization: `Bearer ${token}` },
      payload: body as Record<string, unknown>,
    });

  it('refuses a call without the token', async () => {
    expect((await post({ path: project }, 'wrong')).statusCode).toBe(401);
    const list = await app.inject({ method: 'GET', url: '/api/office/directories' });
    expect(list.statusCode).toBe(401);
    expect(readConfig().directories).toEqual([]);
  });

  it('adds a Directory with its agent name and briefing, and every office hears of it', async () => {
    const res = await post({ name: 'Reviews', path: project, agentName: 'Ana', briefing: 'Role.' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      directory: {
        name: 'Reviews',
        path: project,
        agentName: 'Ana',
        briefing: 'Role.',
        source: 'user',
      },
      launched: false,
    });
    expect(readConfig().directories).toEqual([
      { name: 'Reviews', path: project, agentName: 'Ana', briefing: 'Role.' },
    ]);
    expect(broadcasts.some((m) => m.type === 'directoriesLoaded')).toBe(true);
  });

  it('an update keeps what it does not mention', async () => {
    await post({ name: 'Reviews', path: project, agentName: 'Ana', briefing: 'Role.' });
    await post({ path: project, agentName: 'Bia' });
    expect(readConfig().directories).toEqual([
      { name: 'Reviews', path: project, agentName: 'Bia', briefing: 'Role.' },
    ]);
  });

  it('rejects a path that is not a directory, and needs one', async () => {
    const bad = await post({ name: 'X', path: path.join(project, 'nope') });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toMatch(/No such directory/);
    expect((await post({ name: 'X' })).statusCode).toBe(400);
  });

  it('says so when it cannot launch (no terminals), keeping the saved Directory', async () => {
    const res = await post({ name: 'Reviews', path: project, launch: true });
    expect(res.statusCode).toBe(409);
    expect(readConfig().directories).toHaveLength(1);
  });

  it('lists the Directories', async () => {
    await post({ name: 'Reviews', path: project, agentName: 'Ana' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/office/directories',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.json().directories).toEqual([
      { name: 'Reviews', path: project, agentName: 'Ana', source: 'user' },
    ]);
  });
});

describe('escritorinho agent (arguments)', () => {
  it('reads add with every option', () => {
    expect(
      parseAgentArgs([
        'add',
        '--name',
        'Reviews',
        '--path',
        '/p',
        '--agent-name',
        'Ana',
        '--briefing',
        'Role.',
        '--launch',
      ]),
    ).toEqual({
      action: 'add',
      name: 'Reviews',
      path: '/p',
      agentName: 'Ana',
      briefing: 'Role.',
      launch: true,
    });
  });

  it('launch implies --launch; list needs nothing', () => {
    expect(parseAgentArgs(['launch', '--path', '/p'])).toEqual({
      action: 'launch',
      path: '/p',
      launch: true,
    });
    expect(parseAgentArgs(['list'])).toEqual({ action: 'list', launch: false });
  });

  it('explains its usage on a mistake', () => {
    expect(() => parseAgentArgs([])).toThrow(AgentCommandError);
    expect(() => parseAgentArgs(['add', '--name', 'X'])).toThrow(/--path is required/);
    expect(() => parseAgentArgs(['add', '--path'])).toThrow(/Missing value/);
    expect(() => parseAgentArgs(['add', '--path', '/p', '--evil'])).toThrow(/Unknown option/);
  });
});
