// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over. Clicks
// are resolved against the kitchen's hit zones — tickets, stations, bins, serve, trash.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, INGREDIENTS, LAYOUT, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURNT, EVENT_CHOP, EVENT_EXPIRE, EVENT_MISTAKE, EVENT_OVER, EVENT_PLACE, EVENT_READY, EVENT_SERVE } from './world.js';
import { ACTION_COLLECT, ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** Where a click lands, in logical pixels: ticket, station, bin, serve or trash. */
function hitZone(point) {
  if (!point) return null;
  const { x, y } = point;
  const board = LAYOUT.board;
  if (x >= board.x && x < board.x + board.width && y >= board.y + 52 && y < board.y + 52 + world.state.tickets.length * 120) {
    return { select: Math.floor((y - board.y - 52) / 120) };
  }
  const stove = LAYOUT.stove;
  if (x >= stove.x && x < stove.x + stove.width && y >= stove.y && y < stove.y + stove.height) {
    return { station: x < stove.x + stove.width / 2 ? 'grill' : 'pan' };
  }
  const station = LAYOUT.boardStation;
  if (x >= station.x && x < station.x + station.width && y >= station.y && y < station.y + station.height) {
    return { station: 'board' };
  }
  const bins = LAYOUT.bins;
  const binWidth = (bins.width - (INGREDIENTS.length - 1) * bins.gap) / INGREDIENTS.length;
  if (y >= bins.y && y < bins.y + bins.height) {
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const bx = bins.x + index * (binWidth + bins.gap);
      if (x >= bx && x < bx + binWidth) return { bin: index };
    }
  }
  const serve = LAYOUT.serve;
  if (x >= serve.x && x < serve.x + serve.width && y >= serve.y && y < serve.y + serve.height) {
    return { serve: true };
  }
  const trash = LAYOUT.trash;
  if (x >= trash.x && x < trash.x + trash.width && y >= trash.y && y < trash.y + trash.height) {
    return { trash: true };
  }
  return null;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function playEvents(events) {
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_READY) audio.ready();
    if (events & EVENT_SERVE) audio.serve();
    if (events & (EVENT_MISTAKE | EVENT_EXPIRE | EVENT_BURNT)) audio.mistake();
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    lastTickSecond = -1;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the orders before their timers run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Served ${world.state.served}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const bins = input.takeBinPresses();
    const rawClick = input.takeClick();
    const click = hitZone(rawClick);
    if (actions & (ACTION_CONFIRM | ACTION_SERVE) || bins.length > 0 || rawClick) audio.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    // The title screen promises "Press Space or click to start": any click starts.
    if (rawClick && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // Every pressed bin lands, in order, then the click and the one-shot keys:
    // a fast cook mashing keys must never lose an ingredient.
    const intents = bins.map((bin) => ({ bin }));
    if (click) {
      if (click.bin !== undefined) intents.push({ bin: click.bin });
      else if (click.station) intents.push({ station: click.station });
      else if (click.serve) intents.push({ serve: true });
      else if (click.trash) intents.push({ trash: true });
      else if (click.select !== undefined) intents.push({ select: click.select });
    }
    const keys = {};
    // Space/Enter serve on the play screen, exactly like S — the game promises it.
    if (actions & (ACTION_CONFIRM | ACTION_SERVE)) keys.serve = true;
    if (actions & ACTION_TRASH) keys.trash = true;
    if (actions & ACTION_COLLECT) keys.collect = true;
    if (Object.keys(keys).length > 0) intents.push(keys);
    let events = 0;
    for (const intent of intents) events |= world.step(0, intent, false);
    playEvents(events);
    if (events & EVENT_SERVE) {
      announce(`Served! Score ${world.state.score}. Combo x${world.state.combo}.`);
    } else if (events & EVENT_EXPIRE) {
      announce(`Order missed. ${world.state.hearts} hearts left.`);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    const events = world.step(STEP, null, false);
    playEvents(events);
    // A soft tick in the last ten seconds of the shift, so the clock can be felt.
    const secondsLeft = Math.ceil(world.state.shiftLeft);
    if (secondsLeft <= 10 && secondsLeft !== lastTickSecond && secondsLeft > 0) {
      lastTickSecond = secondsLeft;
      audio.tick();
    }
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_EXPIRE) announce(`Order missed. ${world.state.hearts} hearts left.`);
    else if (events & EVENT_SERVE) announce(`Served! Score ${world.state.score}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
