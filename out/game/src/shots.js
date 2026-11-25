// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a scripted cook
// that follows the selected ticket's recipe, so the frame is what a real game looks
// like and the same seed always gives the same frame.

import { INGREDIENTS, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const SAMPLE = STEP;

/** One scripted move, applied once the staged clock reaches `at` seconds. */
function move(at, intent) {
  return { at, intent, done: false };
}

function binIndexFor(id) {
  return INGREDIENTS.findIndex((entry) => entry.id === id);
}

function prepFor(id) {
  return INGREDIENTS.find((entry) => entry.id === id)?.prep ?? 'none';
}

/**
 * The moves that cook one dish from `ticket`: every ingredient in the recipe's order,
 * waiting out the grill and the pan and chopping twice where the recipe asks for it.
 * `stopAfter` cuts the script short, leaving the dish mid-assembly.
 */
function cookTicketMoves(ticket, stopAfter) {
  const moves = [];
  let at = 0.5;
  const needs = ticket.needs.slice(0, stopAfter ?? ticket.needs.length);
  for (const id of needs) {
    const bin = binIndexFor(id);
    const prep = prepFor(id);
    if (prep === 'none') {
      moves.push(move(at, { bin }));
      at += 0.4;
    } else if (prep === 'grill') {
      moves.push(move(at, { bin }));
      at += 4.6; // let the patty finish, then collect it from the grill
      moves.push(move(at, { bin }));
      at += 0.4;
    } else if (prep === 'fry') {
      moves.push(move(at, { bin }));
      at += 3.6; // let the egg finish, then collect it from the pan
      moves.push(move(at, { bin }));
      at += 0.4;
    } else if (prep === 'chop') {
      moves.push(move(at, { bin }));
      at += 0.3;
      moves.push(move(at, { bin })); // first chop
      at += 0.3;
      moves.push(move(at, { bin })); // second chop moves it to the plate
      at += 0.4;
    }
  }
  return moves;
}

/** Step the world forward for `seconds`, applying each scripted move when its time comes. */
function runScript(world, seconds, moves) {
  let clock = 0;
  for (let step = 0; step < seconds / SAMPLE; step += 1) {
    let intent = null;
    for (const entry of moves) {
      if (!entry.done && clock >= entry.at) {
        entry.done = true;
        intent = entry.intent;
      }
    }
    world.step(SAMPLE, intent, false);
    clock += SAMPLE;
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title over a live kitchen: two tickets on the board, bins full, stove idle.
    for (let index = 0; index < START_SECONDS / SAMPLE; index += 1) {
      world.step(SAMPLE, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const tickets = world.state.tickets;
  if (name === 'play') {
    // Mid-assembly: most of the dish is on the plate and the last ingredient is
    // still being worked on — on the grill, in the pan or half-chopped on the
    // board — while the ticket's timer runs. Pick a ticket whose last ingredient
    // needs prep, so something is visibly in progress.
    const ticket = tickets.find((entry) => prepFor(entry.needs[entry.needs.length - 1]) !== 'none') ?? tickets[0];
    const moves = [move(0.1, { select: tickets.indexOf(ticket) }), ...cookTicketMoves(ticket, Math.max(1, ticket.needs.length - 1))];
    const last = ticket.needs[ticket.needs.length - 1];
    const lastPrep = prepFor(last);
    if (lastPrep === 'grill' || lastPrep === 'fry') {
      // Start it cooking and leave it on the heat.
      moves.push(move(9.5, { bin: binIndexFor(last) }));
    } else if (lastPrep === 'chop') {
      // Onto the board, one chop landed, one to go.
      moves.push(move(9.5, { bin: binIndexFor(last) }));
      moves.push(move(9.9, { bin: binIndexFor(last) }));
    }
    // A no-prep last ingredient is left off entirely: the plate stays incomplete.
    runScript(world, 12, moves);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  const ticket = tickets[0];
  // End: the whole dish is stacked on the plate, ready to serve, with the ticket
  // still open and the shift clock ticking.
  const moves = cookTicketMoves(ticket);
  runScript(world, 20, moves);
  const over = world.state.hearts === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
