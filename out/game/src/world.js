// The game's rules and state, with no drawing and no browser in it: orders on the board,
// the grill, the pan and the chopping board, the plate, the shift clock, score, combo and
// hearts. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (and play a sound) without the world knowing about screens or audio.
// Nothing here allocates after createWorld returns.

import {
  BOARD,
  GRILL,
  HEARTS,
  INGREDIENTS,
  LEVEL,
  MISTAKE_PENALTY,
  ORDERS,
  PAN,
  PLATE_CAPACITY,
  RECIPES,
  SCORING,
  SHIFT_SECONDS,
} from './config.js';

export const EVENT_PLACE = 1;
export const EVENT_CHOP = 2;
export const EVENT_READY = 4;
export const EVENT_SERVE = 8;
export const EVENT_MISTAKE = 16;
export const EVENT_EXPIRE = 32;
export const EVENT_OVER = 64;
export const EVENT_BURNT = 128;

/** True when two ingredient lists hold the same items, in any order. */
function sameDish(a, b) {
  if (a.length !== b.length) return false;
  const rest = [...b];
  for (const item of a) {
    const index = rest.indexOf(item);
    if (index === -1) return false;
    rest.splice(index, 1);
  }
  return true;
}

function ingredientById(id) {
  return INGREDIENTS.find((entry) => entry.id === id) ?? null;
}

export function createWorld(random) {
  const state = {
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    hearts: HEARTS,
    level: 1,
    elapsed: 0,
    shiftLeft: SHIFT_SECONDS,
    tickets: [],
    plate: [],
    grill: { kind: null, progress: 0, state: 'empty' },
    pan: { kind: null, progress: 0, state: 'empty' },
    board: { kind: null, chops: 0, state: 'empty' },
    spawnTimer: ORDERS.firstAtSeconds,
    nextTicketId: 1,
    message: '',
    messageTimer: 0,
  };

  function say(text) {
    state.message = text;
    state.messageTimer = 2.5;
  }

  function spawnInterval() {
    return Math.max(
      ORDERS.minSpawnInterval,
      ORDERS.spawnInterval + ORDERS.spawnIntervalPerLevel * (state.level - 1),
    );
  }

  function ticketSeconds() {
    return Math.max(
      ORDERS.minTicketSeconds,
      ORDERS.ticketSeconds + ORDERS.ticketSecondsPerLevel * (state.level - 1),
    );
  }

  /** Pick a recipe the kitchen can handle at this level: short dishes first, longer ones later. */
  function pickRecipe() {
    const pool = state.level >= 3 ? RECIPES : state.level >= 2 ? RECIPES.slice(0, 4) : RECIPES.slice(0, 3);
    return pool[Math.floor(random() * pool.length)];
  }

  function spawnTicket() {
    if (state.tickets.length >= ORDERS.maxTickets) return;
    const recipe = pickRecipe();
    state.tickets.push({
      id: state.nextTicketId,
      recipeId: recipe.id,
      name: recipe.name,
      needs: [...recipe.needs],
      pay: recipe.pay,
      left: ticketSeconds(),
      total: ticketSeconds(),
      selected: state.tickets.length === 0,
    });
    state.nextTicketId += 1;
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.missed = 0;
    state.hearts = HEARTS;
    state.level = 1;
    state.elapsed = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.tickets = [];
    state.plate = [];
    state.grill = { kind: null, progress: 0, state: 'empty' };
    state.pan = { kind: null, progress: 0, state: 'empty' };
    state.board = { kind: null, chops: 0, state: 'empty' };
    state.spawnTimer = ORDERS.spawnInterval;
    state.nextTicketId = 1;
    state.message = '';
    state.messageTimer = 0;
    spawnTicket();
    spawnTicket();
  }

  function plateHasRoom() {
    return state.plate.length < PLATE_CAPACITY;
  }

  function moveToPlate(kind) {
    if (!plateHasRoom()) {
      say('Plate is full — serve or trash it first');
      return 0;
    }
    state.plate.push(kind);
    return EVENT_PLACE;
  }

  /** Cook a station forward by `dt`; returns events when an item finishes or burns. */
  function cookStation(station, cookSeconds, burnSeconds, label, dt) {
    if (station.state !== 'cooking') return 0;
    station.progress += dt;
    if (station.progress >= burnSeconds) {
      station.state = 'burnt';
      say(`${label} burnt! Click it to toss it`);
      return EVENT_BURNT;
    }
    if (station.progress >= cookSeconds) {
      station.state = 'done';
      say(`${label} is ready!`);
      return EVENT_READY;
    }
    return 0;
  }

  /**
   * One station's click: start cooking, collect a finished item, or toss a burnt one.
   * `kind` is the ingredient that belongs on the station.
   */
  function useStation(station, kind, label, events) {
    if (station.state === 'empty') {
      station.kind = kind;
      station.progress = 0;
      station.state = 'cooking';
      return events | EVENT_PLACE;
    }
    if (station.state === 'burnt') {
      station.kind = null;
      station.progress = 0;
      station.state = 'empty';
      say(`Burnt ${label} tossed`);
      return events | EVENT_MISTAKE;
    }
    if (station.state === 'done') {
      const placed = moveToPlate(station.kind);
      if (placed !== 0) {
        station.kind = null;
        station.progress = 0;
        station.state = 'empty';
        return events | placed;
      }
      return events;
    }
    say(`${label} is still cooking`);
    return events;
  }

  function addIngredient(id) {
    const ingredient = ingredientById(id);
    if (ingredient === null) return 0;
    if (ingredient.prep === 'none') return moveToPlate(id);
    if (ingredient.prep === 'grill') return useStation(state.grill, id, 'Patty', 0);
    if (ingredient.prep === 'fry') return useStation(state.pan, id, 'Egg', 0);
    // Chop: the board takes one item and needs two chops before it reaches the plate.
    const board = state.board;
    if (board.state === 'empty') {
      board.kind = id;
      board.chops = 0;
      board.state = 'chopping';
      return EVENT_PLACE;
    }
    if (board.kind !== id) {
      say('Chopping board is busy');
      return 0;
    }
    board.chops += 1;
    if (board.chops >= BOARD.chopsNeeded) {
      const placed = moveToPlate(board.kind);
      if (placed !== 0) {
        board.kind = null;
        board.chops = 0;
        board.state = 'empty';
        return placed;
      }
      board.chops = BOARD.chopsNeeded;
      return EVENT_CHOP;
    }
    return EVENT_CHOP;
  }

  function collectReady() {
    let events = 0;
    for (const [station, label] of [[state.grill, 'Patty'], [state.pan, 'Egg']]) {
      if (station.state === 'done') events |= useStation(station, station.kind, label, 0);
      else if (station.state === 'burnt') events |= useStation(station, station.kind, label, 0);
    }
    return events;
  }

  function serve() {
    const ticket = state.tickets.find((entry) => entry.selected) ?? state.tickets[0];
    if (!ticket) {
      say('No orders yet');
      return EVENT_MISTAKE;
    }
    if (!sameDish(state.plate, ticket.needs)) {
      state.combo = 0;
      state.score = Math.max(0, state.score - MISTAKE_PENALTY);
      say(`Wrong dish! ${ticket.name} needs ${ticket.needs.length} items`);
      return EVENT_MISTAKE;
    }
    const timeBonus = Math.round(ticket.left) * SCORING.timeBonusPerSecond;
    const comboBonus = state.combo * SCORING.comboPerStep;
    state.score += ticket.pay + timeBonus + comboBonus;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.served / LEVEL.servesPerLevel));
    state.tickets = state.tickets.filter((entry) => entry.id !== ticket.id);
    if (state.tickets.length > 0) state.tickets[0].selected = true;
    state.plate = [];
    say(`Served ${ticket.name}! +${ticket.pay + timeBonus + comboBonus}`);
    return EVENT_SERVE;
  }

  /**
   * One fixed step. `intent` carries what the player did this step: a bin index to add,
   * a station to click, or serve / trash / collect / select. With `attract` set (the title
   * screen's backdrop) the kitchen idles: tickets never expire and the shift never ends.
   */
  function step(dt, intent, attract) {
    let events = 0;
    if (intent) {
      if (intent.bin !== undefined && intent.bin >= 0) {
        const ingredient = INGREDIENTS[intent.bin];
        if (ingredient) events |= addIngredient(ingredient.id);
      }
      if (intent.station === 'grill') events |= useStation(state.grill, 'patty', 'Patty', 0);
      else if (intent.station === 'pan') events |= useStation(state.pan, 'egg', 'Egg', 0);
      else if (intent.station === 'board') {
        const board = state.board;
        if (board.state === 'chopping') events |= addIngredient(board.kind);
      }
      if (intent.collect) events |= collectReady();
      if (intent.serve) events |= serve();
      if (intent.trash) {
        state.plate = [];
        say('Plate cleared');
      }
      if (intent.select !== undefined && intent.select >= 0 && intent.select < state.tickets.length) {
        for (const ticket of state.tickets) ticket.selected = false;
        state.tickets[intent.select].selected = true;
      }
    }

    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }

    events |= cookStation(state.grill, GRILL.cookSeconds, GRILL.burnSeconds, 'Patty', dt);
    events |= cookStation(state.pan, PAN.cookSeconds, PAN.burnSeconds, 'Egg', dt);

    if (attract) return events;

    state.elapsed += dt;
    state.shiftLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    if (state.shiftLeft <= 0) {
      events |= EVENT_OVER;
      return events;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnTicket();
      state.spawnTimer = spawnInterval();
    }

    for (let index = state.tickets.length - 1; index >= 0; index -= 1) {
      const ticket = state.tickets[index];
      ticket.left -= dt;
      if (ticket.left > 0) continue;
      state.tickets.splice(index, 1);
      state.missed += 1;
      state.hearts -= 1;
      state.combo = 0;
      say(`Order missed! ${ticket.name} walked out`);
      events |= EVENT_EXPIRE;
      if (state.tickets.length > 0) state.tickets[0].selected = true;
      if (state.hearts <= 0) {
        events |= EVENT_OVER;
        return events;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, serve, addIngredient, collectReady };
}
