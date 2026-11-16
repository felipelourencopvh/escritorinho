/**
 * Resting agents' activities (engine/leisure.ts): where they happen, how one
 * starts and ends, a chat's turns, and work interrupting all of it.
 *
 * Run with: npm test
 */
import assert from 'node:assert/strict';

import { beforeAll, test } from 'vitest';

import { createCharacter } from '../src/office/engine/characters.js';
import {
  arriveAtLeisure,
  findLeisureSpots,
  type LeisureWorld,
  tickLeisure,
  tryStartLeisure,
} from '../src/office/engine/leisure.js';
import type { LoadedAssetData } from '../src/office/layout/furnitureCatalog.js';
import { buildDynamicCatalog } from '../src/office/layout/furnitureCatalog.js';
import {
  getBlockedTiles,
  layoutToSeats,
  layoutToTileMap,
} from '../src/office/layout/layoutSerializer.js';
import type { Character, OfficeLayout } from '../src/office/types.js';
import { CharacterState, Direction, TileType } from '../src/office/types.js';

type CatalogAsset = LoadedAssetData['catalog'][number];

beforeAll(() => {
  const asset = (
    a: Partial<CatalogAsset> & Pick<CatalogAsset, 'id' | 'category'>,
  ): CatalogAsset => ({
    label: a.id,
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    isDesk: false,
    ...a,
  });
  const catalog = [
    asset({
      id: 'TV',
      category: 'wall',
      width: 32,
      height: 32,
      footprintW: 2,
      footprintH: 2,
      canPlaceOnWalls: true,
    }),
    asset({ id: 'SOFA_BACK', category: 'chairs', orientation: 'back' }),
    asset({ id: 'SOFA_SIDE', category: 'chairs', orientation: 'side' }),
    asset({
      id: 'KITCHEN_COUNTER',
      category: 'desks',
      isDesk: true,
      width: 32,
      height: 32,
      footprintW: 2,
      footprintH: 2,
      backgroundTiles: 1,
    }),
    asset({ id: 'MICROWAVE', category: 'electronics', canPlaceOnSurfaces: true }),
  ];
  const sprites = Object.fromEntries(catalog.map((a) => [a.id, [['x']]]));
  assert.ok(buildDynamicCatalog({ catalog, sprites }));
});

function office(): OfficeLayout {
  const cols = 10;
  const rows = 10;
  return {
    version: 1,
    cols,
    rows,
    tiles: new Array<TileType>(cols * rows).fill(TileType.FLOOR_1),
    furniture: [
      { uid: 'tv', type: 'TV', col: 3, row: 0 },
      { uid: 'sofa', type: 'SOFA_BACK', col: 3, row: 5 },
      { uid: 'side', type: 'SOFA_SIDE', col: 2, row: 5 },
      { uid: 'counter', type: 'KITCHEN_COUNTER', col: 6, row: 7 },
      { uid: 'microwave', type: 'MICROWAVE', col: 7, row: 7 },
    ],
  };
}

function world(characters: Character[], random = () => 0): LeisureWorld {
  const layout = office();
  const seats = layoutToSeats(layout.furniture);
  const blockedTiles = getBlockedTiles(layout.furniture);
  return {
    spots: findLeisureSpots(layout.furniture, seats, blockedTiles),
    characters: new Map(characters.map((c) => [c.id, c])),
    seats,
    tileMap: layoutToTileMap(layout),
    blockedTiles,
    random,
  };
}

function resting(id: number, col: number, row: number): Character {
  const ch = createCharacter(id, 0, null, null);
  ch.tileCol = col;
  ch.tileRow = row;
  ch.state = CharacterState.IDLE;
  ch.isActive = false;
  ch.matrixEffect = null;
  return ch;
}

test('spots: a sofa facing the TV, another sofa to lounge on, and the counter worktop', () => {
  const w = world([]);
  assert.deepEqual(
    w.spots.map((s) => ({ kind: s.kind, col: s.col, row: s.row })),
    [
      { kind: 'tv', col: 3, row: 5 },
      { kind: 'kitchen', col: 6, row: 7 },
      { kind: 'sofa', col: 2, row: 5 },
    ],
  );
});

test('a resting agent walks to the TV, sits down for the show, and gets up after it', () => {
  const ch = resting(1, 0, 9);
  const w = world([ch]);
  assert.ok(tryStartLeisure(ch, w));
  assert.equal(ch.state, CharacterState.WALK);
  assert.equal(ch.leisure?.kind, 'tv');
  const last = ch.path[ch.path.length - 1];
  assert.deepEqual(last, { col: 3, row: 5 }); // through the sofa, a chair, opened just for this
  assert.ok(w.blockedTiles.has('3,5')); // and blocked again for everyone else

  ch.tileCol = 3;
  ch.tileRow = 5;
  ch.path = [];
  arriveAtLeisure(ch);
  assert.equal(ch.state, CharacterState.TYPE); // the seated frame
  assert.equal(ch.dir, Direction.UP);
  assert.ok(ch.seatTimer > 0);

  ch.state = CharacterState.IDLE; // the FSM stood it up when the show ended
  tickLeisure(0.1, w, 0);
  assert.equal(ch.leisure, null);
});

test('making popcorn shows the popcorn bubble, then ends', () => {
  const ch = resting(1, 6, 6);
  const w = world([ch]);
  ch.leisure = { kind: 'kitchen', phase: 'going', col: 6, row: 7, dir: Direction.DOWN, timer: 2 };
  arriveAtLeisure(ch);
  tickLeisure(0.5, w, 0);
  assert.equal(ch.leisureBubble, 'popcorn');
  assert.equal(ch.dir, Direction.DOWN);
  tickLeisure(2, w, 0);
  assert.equal(ch.leisure, null);
  assert.equal(ch.leisureBubble, null);
});

test('a chat: the partner waits, both face each other and take turns talking', () => {
  const a = resting(1, 1, 8);
  const b = resting(2, 4, 8);
  // No TV, sofa or kitchen free (all taken), so the only option is a chat.
  const w = world([a, b]);
  const busy = w.spots.map((s, i) => {
    const other = resting(100 + i, s.col, s.row);
    return other;
  });
  const full: LeisureWorld = {
    ...w,
    characters: new Map([...[a, b, ...busy].map((c) => [c.id, c] as const)]),
  };
  for (const o of busy)
    o.leisure = {
      kind: 'tv',
      phase: 'at',
      col: o.tileCol,
      row: o.tileRow,
      dir: Direction.UP,
      timer: 99,
    };
  assert.ok(tryStartLeisure(a, full));
  assert.equal(a.leisure?.kind, 'chat');
  assert.equal(b.leisure?.phase, 'waiting');
  assert.equal(b.leisure?.partnerId, 1);

  // a arrives next to b
  const target = a.leisure!;
  a.tileCol = target.col;
  a.tileRow = target.row;
  a.path = [];
  arriveAtLeisure(a);
  tickLeisure(0.1, full, 0);
  assert.equal(b.leisure?.phase, 'at');
  assert.equal(a.dir, Direction.RIGHT);
  assert.equal(b.dir, Direction.LEFT);
  const first = [a.leisureBubble, b.leisureBubble];
  tickLeisure(0.1, full, 1.7); // next turn
  const second = [a.leisureBubble, b.leisureBubble];
  assert.deepEqual(first.filter(Boolean), ['talk']);
  assert.deepEqual(second.filter(Boolean), ['talk']);
  assert.notDeepEqual(first, second);
  // The one who walked over greets first; the other answers.
  tickLeisure(0.1, full, 0.1);
  assert.equal(a.leisureBubble, 'talk');
  assert.equal(a.leisureLine, 0);
  assert.equal(b.leisureLine, null);
  tickLeisure(0.1, full, 1.7);
  assert.equal(b.leisureLine, 1);
  assert.equal(a.leisureLine, null);
});

test('work arriving drops the activity, and frees a chat partner', () => {
  const a = resting(1, 1, 8);
  const b = resting(2, 2, 8);
  const w = world([a, b]);
  a.leisure = {
    kind: 'chat',
    phase: 'at',
    col: 1,
    row: 8,
    dir: Direction.RIGHT,
    timer: 10,
    partnerId: 2,
  };
  b.leisure = {
    kind: 'chat',
    phase: 'at',
    col: 2,
    row: 8,
    dir: Direction.LEFT,
    timer: 10,
    partnerId: 1,
  };
  a.isActive = true;
  tickLeisure(0.1, w, 0);
  assert.equal(a.leisure, null);
  assert.equal(b.leisure, null);
});

test('never starts while working, already busy, or on an unlucky roll', () => {
  const ch = resting(1, 0, 9);
  ch.isActive = true;
  assert.equal(tryStartLeisure(ch, world([ch])), false);
  const idle = resting(2, 0, 9);
  assert.equal(
    tryStartLeisure(
      idle,
      world([idle], () => 0.99),
    ),
    false,
  );
  assert.equal(idle.leisure ?? null, null);
});

test('two agents seated near each other chat from the sofa, with a quiet beat', () => {
  const a = resting(1, 3, 5);
  const b = resting(2, 2, 5);
  const w = world([a, b]);
  for (const [ch, kind] of [
    [a, 'tv'],
    [b, 'sofa'],
  ] as const) {
    ch.leisure = {
      kind,
      phase: 'going',
      col: ch.tileCol,
      row: ch.tileRow,
      dir: Direction.UP,
      timer: 60,
    };
    arriveAtLeisure(ch);
    assert.equal(ch.state, CharacterState.TYPE);
  }
  tickLeisure(0.1, w, 0); // a looks around first and finds b: a greets
  assert.equal(a.leisure?.couchMate, 2);
  assert.equal(b.leisure?.couchMate, 1);
  assert.equal(a.leisureLine, 0);
  assert.equal(b.leisureBubble, null);
  tickLeisure(0.1, w, 1.7);
  assert.equal(b.leisureLine, 1);
  assert.equal(a.leisureBubble, null);
  tickLeisure(0.1, w, 3.3); // the quiet beat
  assert.equal(a.leisureBubble, null);
  assert.equal(b.leisureBubble, null);
  // b gets up: a stops talking, still lounging
  b.isActive = true;
  tickLeisure(0.1, w, 4.9);
  tickLeisure(0.1, w, 5);
  assert.equal(b.leisure, null);
  assert.equal(a.leisure?.kind, 'tv');
  assert.equal(a.leisure?.couchMate, undefined);
  assert.equal(a.leisureBubble, null);
});

test('after enough strolls, an agent off duty surely goes to relax (the dice are skipped)', () => {
  const ch = resting(1, 0, 9);
  const unlucky = world([ch], () => 0.99);
  assert.equal(tryStartLeisure(ch, unlucky), false);
  assert.ok(tryStartLeisure(ch, unlucky, true));
  assert.ok(ch.leisure);
});
