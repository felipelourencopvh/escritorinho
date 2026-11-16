import Fastify, { type FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentStateStore } from '../src/agentStateStore.js';
import { DESK_DIR_NAME, DESK_MAX_FILE_NAME_LENGTH } from '../src/constants.js';
import { registerDeskRoutes, safeDeskFileName, writeToDesk } from '../src/deskRoutes.js';

describe('safeDeskFileName', () => {
  it('keeps an ordinary name', () => {
    expect(safeDeskFileName('Edital 24-2026.pdf')).toBe('Edital 24-2026.pdf');
  });

  it('drops any path, so nothing lands outside the desk', () => {
    expect(safeDeskFileName('../../.ssh/authorized_keys')).toBe('authorized_keys');
    expect(safeDeskFileName('..\\..\\evil.bat')).toBe('evil.bat');
    expect(safeDeskFileName('/etc/passwd')).toBe('passwd');
  });

  it('never yields an empty, dot or hidden-by-accident name', () => {
    expect(safeDeskFileName('')).toBe('file');
    expect(safeDeskFileName('..')).toBe('file');
    expect(safeDeskFileName('.')).toBe('file');
    expect(safeDeskFileName('  .env  ')).toBe('env');
  });

  it('replaces control and reserved characters', () => {
    expect(safeDeskFileName('a\x00b<c>d:e"f|g?h*i.txt')).toBe('a_b_c_d_e_f_g_h_i.txt');
  });

  it('caps the length and keeps the extension', () => {
    const name = safeDeskFileName(`${'x'.repeat(500)}.pdf`);
    expect(name).toHaveLength(DESK_MAX_FILE_NAME_LENGTH);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});

describe('writeToDesk', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-desk-test-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('creates the desk and never overwrites a file', () => {
    const desk = path.join(dir, DESK_DIR_NAME);
    const first = writeToDesk(desk, 'a.pdf', Buffer.from('one'));
    const second = writeToDesk(desk, 'a.pdf', Buffer.from('two'));
    expect(path.basename(first)).toBe('a.pdf');
    expect(path.basename(second)).toBe('a (2).pdf');
    expect(fs.readFileSync(first, 'utf8')).toBe('one');
    expect(fs.readFileSync(second, 'utf8')).toBe('two');
  });

  it('refuses a desk that is a link to somewhere else', () => {
    const elsewhere = path.join(dir, 'elsewhere');
    fs.mkdirSync(elsewhere);
    const desk = path.join(dir, DESK_DIR_NAME);
    fs.symlinkSync(elsewhere, desk);
    expect(() => writeToDesk(desk, 'a.pdf', Buffer.from('x'))).toThrow();
    expect(fs.readdirSync(elsewhere)).toEqual([]);
  });

  it('does not write through a link planted under the file name', () => {
    const desk = path.join(dir, DESK_DIR_NAME);
    fs.mkdirSync(desk);
    const target = path.join(dir, 'target.txt');
    fs.writeFileSync(target, 'keep');
    fs.symlinkSync(target, path.join(desk, 'a.txt'));
    const saved = writeToDesk(desk, 'a.txt', Buffer.from('new'));
    expect(path.basename(saved)).toBe('a (2).txt');
    expect(fs.readFileSync(target, 'utf8')).toBe('keep');
  });
});

describe('POST /api/desk/:agentId', () => {
  const TOKEN = 'secret-token';
  let dir: string;
  let app: FastifyInstance;
  let store: AgentStateStore;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-desk-route-'));
    store = new AgentStateStore();
    store.set(7, { id: 7, cwd: dir } as never);
    store.set(8, { id: 8 } as never);
    app = Fastify();
    registerDeskRoutes(app, { token: TOKEN, allowedHostnames: new Set(['127.0.0.1']), store });
    await app.ready();
  });
  afterEach(async () => {
    await app.close();
    store.dispose();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const post = (opts: {
    id?: number;
    token?: string;
    host?: string;
    origin?: string;
    name?: string;
  }) =>
    app.inject({
      method: 'POST',
      url: `/api/desk/${opts.id ?? 7}?token=${opts.token ?? TOKEN}`,
      headers: {
        host: opts.host ?? '127.0.0.1:3000',
        'content-type': 'application/pdf',
        'x-file-name': encodeURIComponent(opts.name ?? 'Edital nº 24.pdf'),
        ...(opts.origin ? { origin: opts.origin } : {}),
      },
      payload: Buffer.from('%PDF-1.7 test'),
    });

  it("saves the file on the agent's desk and says where", async () => {
    const res = await post({ origin: 'http://127.0.0.1:3000' });
    expect(res.statusCode).toBe(200);
    const saved = path.join(dir, DESK_DIR_NAME, 'Edital nº 24.pdf');
    expect(res.json()).toEqual({ path: saved, name: 'Edital nº 24.pdf' });
    expect(fs.readFileSync(saved, 'utf8')).toBe('%PDF-1.7 test');
  });

  it('refuses a wrong token, an untrusted host or another origin, writing nothing', async () => {
    expect((await post({ token: 'nope' })).statusCode).toBe(401);
    expect((await post({ host: 'evil.example:3000' })).statusCode).toBe(401);
    expect((await post({ origin: 'https://evil.example' })).statusCode).toBe(401);
    expect(fs.existsSync(path.join(dir, DESK_DIR_NAME))).toBe(false);
  });

  it('refuses an agent with no working directory, or none at all', async () => {
    expect((await post({ id: 8 })).statusCode).toBe(404);
    expect((await post({ id: 99 })).statusCode).toBe(404);
  });

  it('saves text and JSON files byte for byte, not parsed', async () => {
    for (const [type, name, body] of [
      ['text/plain', 'notes.txt', 'line 1\nline 2\n'],
      ['application/json', 'data.json', '{"a": 1}'],
    ]) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/desk/7?token=${TOKEN}`,
        headers: { host: '127.0.0.1:3000', 'content-type': type, 'x-file-name': name },
        payload: body,
      });
      expect(res.statusCode).toBe(200);
      expect(fs.readFileSync(path.join(dir, DESK_DIR_NAME, name), 'utf8')).toBe(body);
    }
  });

  it('keeps a path-laden name inside the desk', async () => {
    const res = await post({ name: '../../escape.sh' });
    expect(res.json().path).toBe(path.join(dir, DESK_DIR_NAME, 'escape.sh'));
    expect(fs.existsSync(path.join(dir, '..', 'escape.sh'))).toBe(false);
  });
});
