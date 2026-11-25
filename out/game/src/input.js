// Keyboard and pointer input. Number keys pick an ingredient bin; one-shot presses
// (serve, trash, collect, start, pause) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. Pointer
// clicks are reported as a position the loop resolves against the kitchen's hit zones.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;
export const ACTION_COLLECT = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['KeyS']);
const TRASH = new Set(['KeyT']);
const COLLECT = new Set(['KeyC']);

/** Bin keys '1'..'6', in the order of the ingredient bins. */
const BIN_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

export function createInput(canvas) {
  let actions = 0;
  /** Every bin press, in order: rapid presses between two frames must all land. */
  let binQueue = [];
  let click = null;

  window.addEventListener('keydown', (event) => {
    const binIndex = BIN_KEYS.indexOf(event.code);
    if (binIndex !== -1) {
      if (!event.repeat) binQueue.push(binIndex);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else if (COLLECT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_COLLECT;
    } else {
      return;
    }
    event.preventDefault();
  });

  // The renderer letterboxes the 1280x720 field into the canvas (same scale and
  // centring as render.js), so a click must be un-letterboxed before it becomes a
  // logical position — mapping it as if the field stretched across the whole rect
  // lands clicks in the wrong place on any window that is not exactly 16:9.
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    click = {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The bin presses since the last call, in order (never empty when none). */
    takeBinPresses() {
      const taken = binQueue;
      binQueue = [];
      return taken;
    },
    /** The click position since the last call, in logical pixels, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
