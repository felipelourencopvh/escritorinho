/**
 * What resting agents do instead of only wandering: watch TV from a free sofa
 * facing one, lounge on any other sofa, make popcorn behind a kitchen counter,
 * or chat with another resting agent (walking over to it, or from the sofa
 * with whoever sits nearby). DOM-free; OfficeState wires it into the character FSM.
 *
 * The FSM (characters.ts) only has three small hooks: a resting character
 * about to wander may start an activity instead (`tryStartLeisure`), arriving
 * at one hands over to `arriveAtLeisure`, and a character with an activity
 * holds still. Everything else (timers, bubbles, a chat partner, dropping it
 * all when work arrives) happens here in `tickLeisure`, once per frame.
 */
import {
  LEISURE_CHANCE,
  LEISURE_CHAT_MAX_SEC,
  LEISURE_CHAT_MIN_SEC,
  LEISURE_CHAT_RANGE_TILES,
  LEISURE_CHAT_TURN_SEC,
  LEISURE_CHAT_WAIT_SEC,
  LEISURE_COUCH_RANGE_TILES,
  LEISURE_KITCHEN_MAX_SEC,
  LEISURE_KITCHEN_MIN_SEC,
  LEISURE_SOFA_MAX_SEC,
  LEISURE_SOFA_MIN_SEC,
  LEISURE_TV_MAX_ROWS,
  LEISURE_TV_MAX_SEC,
  LEISURE_TV_MIN_SEC,
  LEISURE_TV_SIDE_SLACK,
  WANDER_PAUSE_MAX_SEC,
  WANDER_PAUSE_MIN_SEC,
} from '../../constants.js';
import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import { findPath } from '../layout/tileMap.js';
import type {
  Character,
  CharacterLeisure,
  PlacedFurniture,
  Seat,
  TileType as TileTypeVal,
} from '../types.js';
import { CharacterState, Direction } from '../types.js';

/** Furniture that makes a spot, by asset id. */
const TV_TYPES = new Set(['TV']);
const KITCHEN_TYPES = new Set(['KITCHEN_COUNTER']);
/** Lounge seating (any orientation: SOFA_FRONT, SOFA_SIDE:left…). */
const isLoungeType = (type: string) => /^(SOFA|COUCH|ARMCHAIR)/.test(type);

export interface LeisureSpot {
  kind: 'tv' | 'sofa' | 'kitchen';
  col: number;
  row: number;
  /** Which way to face there (toward the TV, out over the counter). */
  dir: Direction;
  /** The chair it is, for a TV or sofa spot (only taken while no agent owns it). */
  seatUid?: string;
}

const key = (col: number, row: number) => `${col},${row}`;

/**
 * Where activities happen in this layout. TV: any chair facing up toward a TV
 * on the wall within LEISURE_TV_MAX_ROWS, roughly in line with it. Sofa: every
 * other seat of a sofa. Kitchen: the walk-behind worktop row of each counter,
 * where a free tile is left.
 */
export function findLeisureSpots(
  furniture: readonly PlacedFurniture[],
  seats: ReadonlyMap<string, Seat>,
  blockedTiles: ReadonlySet<string>,
): LeisureSpot[] {
  const spots: LeisureSpot[] = [];
  const tvSeats = new Set<string>();
  for (const item of furniture) {
    const entry = getCatalogEntry(item.type);
    if (!entry) continue;
    if (TV_TYPES.has(item.type)) {
      const bottom = item.row + entry.footprintH - 1;
      for (const seat of seats.values()) {
        if (seat.facingDir !== Direction.UP) continue;
        const rows = seat.seatRow - bottom;
        if (rows < 1 || rows > LEISURE_TV_MAX_ROWS) continue;
        if (seat.seatCol < item.col - LEISURE_TV_SIDE_SLACK) continue;
        if (seat.seatCol > item.col + entry.footprintW - 1 + LEISURE_TV_SIDE_SLACK) continue;
        if (tvSeats.has(seat.uid)) continue; // in view of two TVs
        tvSeats.add(seat.uid);
        spots.push({
          kind: 'tv',
          col: seat.seatCol,
          row: seat.seatRow,
          dir: Direction.UP,
          seatUid: seat.uid,
        });
      }
    } else if (KITCHEN_TYPES.has(item.type)) {
      for (let dc = 0; dc < entry.footprintW; dc++) {
        const col = item.col + dc;
        if (blockedTiles.has(key(col, item.row))) continue; // a microwave stands there
        spots.push({ kind: 'kitchen', col, row: item.row, dir: Direction.DOWN });
      }
    }
  }
  // A seat's uid is its chair's, or `${chair}:N` for the next seats of a long one.
  const typeOf = new Map(furniture.map((f) => [f.uid, f.type]));
  for (const seat of seats.values()) {
    if (tvSeats.has(seat.uid)) continue;
    const type = typeOf.get(seat.uid.split(':')[0]);
    if (!type || !isLoungeType(type)) continue;
    spots.push({
      kind: 'sofa',
      col: seat.seatCol,
      row: seat.seatRow,
      dir: seat.facingDir,
      seatUid: seat.uid,
    });
  }
  return spots;
}

export interface LeisureWorld {
  spots: readonly LeisureSpot[];
  characters: ReadonlyMap<number, Character>;
  seats: ReadonlyMap<string, Seat>;
  tileMap: TileTypeVal[][];
  blockedTiles: Set<string>;
  random?: () => number;
}

function between(min: number, max: number, random: () => number): number {
  return min + random() * (max - min);
}

function restsFreely(ch: Character): boolean {
  return (
    !ch.isActive &&
    !ch.isSubagent &&
    !ch.leisure &&
    ch.matrixEffect === null &&
    !ch.bubbleType &&
    ch.state === CharacterState.IDLE
  );
}

/** Someone to chat with: resting, standing about or sitting out a rest in its chair. */
function canChat(ch: Character): boolean {
  return (
    !ch.isActive &&
    !ch.isSubagent &&
    !ch.leisure &&
    ch.matrixEffect === null &&
    !ch.bubbleType &&
    (ch.state === CharacterState.IDLE || ch.state === CharacterState.TYPE)
  );
}

function faceToward(
  from: { col: number; row: number },
  to: { col: number; row: number },
): Direction {
  const dc = to.col - from.col;
  const dr = to.row - from.row;
  if (Math.abs(dc) >= Math.abs(dr)) return dc < 0 ? Direction.LEFT : Direction.RIGHT;
  return dr < 0 ? Direction.UP : Direction.DOWN;
}

/** Whether some character holds or is heading for this tile. */
function tileTaken(world: LeisureWorld, col: number, row: number, except: number): boolean {
  for (const other of world.characters.values()) {
    if (other.id === except) continue;
    if (other.leisure && other.leisure.col === col && other.leisure.row === row) return true;
    if (other.tileCol === col && other.tileRow === row) return true;
  }
  return false;
}

function pathTo(world: LeisureWorld, ch: Character, col: number, row: number) {
  // A sofa is a chair: blocked for walking through, so open just this one.
  const k = key(col, row);
  const wasBlocked = world.blockedTiles.delete(k);
  const path = findPath(ch.tileCol, ch.tileRow, col, row, world.tileMap, world.blockedTiles);
  if (wasBlocked) world.blockedTiles.add(k);
  return path;
}

function startWalk(
  ch: Character,
  path: Array<{ col: number; row: number }>,
  leisure: CharacterLeisure,
) {
  ch.path = path;
  ch.moveProgress = 0;
  ch.state = CharacterState.WALK;
  ch.frame = 0;
  ch.frameTimer = 0;
  ch.leisure = leisure;
}

/**
 * Called when a resting character would wander next: maybe start an activity
 * instead (`surely`: no dice, it has strolled enough). Returns whether it did
 * (the character is then walking to it).
 */
export function tryStartLeisure(ch: Character, world: LeisureWorld, surely = false): boolean {
  const random = world.random ?? Math.random;
  if (!restsFreely(ch) || (!surely && random() >= LEISURE_CHANCE)) return false;

  const options: Array<() => boolean> = [];

  const freeSpots = world.spots.filter(
    (s) =>
      !(s.seatUid && world.seats.get(s.seatUid)?.assigned) &&
      !tileTaken(world, s.col, s.row, ch.id),
  );
  for (const kind of ['tv', 'sofa', 'kitchen'] as const) {
    const ofKind = freeSpots.filter((s) => s.kind === kind);
    if (ofKind.length === 0) continue;
    options.push(() => {
      const spot = ofKind[Math.floor(random() * ofKind.length)];
      const path = pathTo(world, ch, spot.col, spot.row);
      if (path.length === 0) return false;
      const timer =
        kind === 'tv'
          ? between(LEISURE_TV_MIN_SEC, LEISURE_TV_MAX_SEC, random)
          : kind === 'sofa'
            ? between(LEISURE_SOFA_MIN_SEC, LEISURE_SOFA_MAX_SEC, random)
            : between(LEISURE_KITCHEN_MIN_SEC, LEISURE_KITCHEN_MAX_SEC, random);
      startWalk(ch, path, {
        kind,
        phase: 'going',
        col: spot.col,
        row: spot.row,
        dir: spot.dir,
        timer,
      });
      return true;
    });
  }

  const partners = [...world.characters.values()].filter(
    (o) =>
      o.id !== ch.id &&
      canChat(o) &&
      Math.abs(o.tileCol - ch.tileCol) + Math.abs(o.tileRow - ch.tileRow) <=
        LEISURE_CHAT_RANGE_TILES,
  );
  if (partners.length > 0) {
    // Twice as likely as the TV or the kitchen: company is the point.
    const chat = () => {
      const partner = partners[Math.floor(random() * partners.length)];
      const sides = [
        { col: partner.tileCol - 1, row: partner.tileRow },
        { col: partner.tileCol + 1, row: partner.tileRow },
        { col: partner.tileCol, row: partner.tileRow + 1 },
        { col: partner.tileCol, row: partner.tileRow - 1 },
      ];
      for (const side of sides) {
        if (world.blockedTiles.has(key(side.col, side.row))) continue;
        if (tileTaken(world, side.col, side.row, ch.id)) continue;
        const atSide = ch.tileCol === side.col && ch.tileRow === side.row;
        const path = atSide ? [] : pathTo(world, ch, side.col, side.row);
        if (!atSide && path.length === 0) continue;
        const timer = between(LEISURE_CHAT_MIN_SEC, LEISURE_CHAT_MAX_SEC, random);
        const leisure: CharacterLeisure = {
          kind: 'chat',
          phase: 'going',
          col: side.col,
          row: side.row,
          dir: faceToward(side, { col: partner.tileCol, row: partner.tileRow }),
          timer,
          partnerId: partner.id,
          startedBy: ch.id,
        };
        partner.leisure = {
          kind: 'chat',
          phase: 'waiting',
          col: partner.tileCol,
          row: partner.tileRow,
          dir: faceToward({ col: partner.tileCol, row: partner.tileRow }, side),
          timer: LEISURE_CHAT_WAIT_SEC,
          partnerId: ch.id,
          startedBy: ch.id,
        };
        if (atSide) {
          ch.leisure = leisure;
          arriveAtLeisure(ch);
        } else {
          startWalk(ch, path, leisure);
        }
        return true;
      }
      return false;
    };
    options.push(chat, chat);
  }

  // Try the options in a random order until one works.
  while (options.length > 0) {
    const [pick] = options.splice(Math.floor(random() * options.length), 1);
    if (pick()) return true;
  }
  return false;
}

/** The character reached its activity's tile (called by the FSM). */
export function arriveAtLeisure(ch: Character): void {
  const leisure = ch.leisure;
  if (!leisure) return;
  leisure.phase = 'at';
  ch.dir = leisure.dir;
  ch.frame = 0;
  ch.frameTimer = 0;
  if (leisure.kind === 'tv' || leisure.kind === 'sofa') {
    // Sitting on the sofa: the seated frame, until the show (or the nap) is over.
    ch.state = CharacterState.TYPE;
    ch.seatTimer = leisure.timer;
  } else {
    ch.state = CharacterState.IDLE;
  }
}

/** Drop an activity: the character goes back to its usual rest. */
export function endLeisure(ch: Character, world: Pick<LeisureWorld, 'characters'>): void {
  const partnerId = ch.leisure?.partnerId;
  ch.leisure = null;
  ch.leisureBubble = null;
  ch.leisureLine = null;
  ch.wanderTimer = Math.min(ch.wanderTimer, WANDER_PAUSE_MIN_SEC);
  if (partnerId !== undefined) {
    const partner = world.characters.get(partnerId);
    if (partner?.leisure?.partnerId === ch.id) {
      partner.leisure = null;
      partner.leisureBubble = null;
      partner.leisureLine = null;
      partner.wanderTimer = between(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC, Math.random);
    }
  }
}

/** How many lines a chat can say (chat.line0 … in the dictionaries): 0 is a
 *  greeting, 1 its answer, the rest small talk. */
export const CHAT_LINE_COUNT = 12;

/** The line said on `turn` of a chat, the small talk varied by the pair. */
export function chatLine(turn: number, pairSeed: number): number {
  if (turn <= 1) return turn;
  return 2 + ((pairSeed + turn * 7) % (CHAT_LINE_COUNT - 2));
}

const seated = (ch: Character | undefined): ch is Character & { leisure: CharacterLeisure } =>
  !!ch &&
  !!ch.leisure &&
  (ch.leisure.kind === 'tv' || ch.leisure.kind === 'sofa') &&
  ch.leisure.phase === 'at' &&
  ch.state === CharacterState.TYPE &&
  !ch.isActive;

/**
 * Two agents seated near each other (on the sofas, in front of the TV) chat
 * from where they sit: the one who sat down last greets, the other answers,
 * then small talk with a quiet beat after every exchange.
 */
function couchChat(
  ch: Character,
  leisure: CharacterLeisure,
  world: Pick<LeisureWorld, 'characters'>,
  now: number,
): void {
  let mate = leisure.couchMate !== undefined ? world.characters.get(leisure.couchMate) : undefined;
  if (!seated(mate) || mate.leisure.couchMate !== ch.id) {
    leisure.couchMate = undefined;
    mate = undefined;
    for (const other of world.characters.values()) {
      if (other.id === ch.id || !seated(other) || other.leisure.couchMate !== undefined) continue;
      const d = Math.abs(other.tileCol - ch.tileCol) + Math.abs(other.tileRow - ch.tileRow);
      if (d > LEISURE_COUCH_RANGE_TILES) continue;
      mate = other;
      leisure.couchMate = other.id;
      other.leisure.couchMate = ch.id;
      leisure.startedAt = other.leisure.startedAt = now;
      leisure.startedBy = other.leisure.startedBy = ch.id;
      break;
    }
  }
  if (!mate) {
    ch.leisureBubble = null;
    ch.leisureLine = null;
    return;
  }
  // Beats of LEISURE_CHAT_TURN_SEC: first speaker, second speaker, silence.
  const beat = Math.floor((now - (leisure.startedAt ?? now)) / LEISURE_CHAT_TURN_SEC);
  const spoken = Math.floor(beat / 3) * 2 + (beat % 3);
  const speaking = beat % 3 !== 2 && (beat % 3 === 0) === (ch.id === leisure.startedBy);
  ch.leisureBubble = speaking ? 'talk' : null;
  ch.leisureLine = speaking
    ? chatLine(spoken, Math.min(ch.id, mate.id) * 31 + Math.max(ch.id, mate.id))
    : null;
}

/** Once per frame, after the FSM: timers, bubbles, chat partners, interruptions. */
export function tickLeisure(
  dt: number,
  world: Pick<LeisureWorld, 'characters'>,
  now: number,
): void {
  for (const ch of world.characters.values()) {
    const leisure = ch.leisure;
    if (!leisure) continue;
    // Work comes first: drop everything (the FSM walks it back to its desk).
    if (ch.isActive || ch.matrixEffect === 'despawn') {
      endLeisure(ch, world);
      continue;
    }
    if (leisure.phase === 'going') {
      // The walk ended somewhere else (a blocked path, a reseat): give up.
      if (ch.state !== CharacterState.WALK) endLeisure(ch, world);
      continue;
    }
    if (leisure.kind === 'tv' || leisure.kind === 'sofa') {
      // The FSM stands it up when the show is over.
      if (ch.state !== CharacterState.TYPE) {
        endLeisure(ch, world);
        continue;
      }
      couchChat(ch, leisure, world, now);
      continue;
    }
    if (leisure.kind === 'chat') {
      const partner =
        leisure.partnerId !== undefined ? world.characters.get(leisure.partnerId) : undefined;
      if (!partner || partner.leisure?.partnerId !== ch.id) {
        endLeisure(ch, world);
        continue;
      }
      if (leisure.phase === 'waiting') {
        leisure.timer -= dt;
        ch.dir = leisure.dir;
        if (leisure.timer <= 0) endLeisure(ch, world);
        continue;
      }
      // Both there: the one waiting joins in, facing the newcomer.
      if (partner.leisure.phase === 'waiting') {
        partner.leisure.phase = 'at';
        partner.leisure.timer = leisure.timer;
        partner.dir = faceToward(
          { col: partner.tileCol, row: partner.tileRow },
          { col: ch.tileCol, row: ch.tileRow },
        );
        partner.leisure.dir = partner.dir;
        leisure.startedAt = now;
        partner.leisure.startedAt = now;
      }
      // Turns: the one who came over speaks first, then they alternate. The
      // first two lines are a greeting and its answer, the rest small talk.
      const startedAt = leisure.startedAt ?? now;
      const turn = Math.floor((now - startedAt) / LEISURE_CHAT_TURN_SEC);
      const speaking = (turn % 2 === 0) === (ch.id === leisure.startedBy);
      ch.leisureBubble = speaking ? 'talk' : null;
      ch.leisureLine = speaking
        ? chatLine(turn, Math.min(ch.id, partner.id) * 31 + Math.max(ch.id, partner.id))
        : null;
    } else {
      ch.leisureBubble = 'popcorn';
    }
    ch.dir = leisure.dir;
    leisure.timer -= dt;
    if (leisure.timer <= 0) endLeisure(ch, world);
  }
}
