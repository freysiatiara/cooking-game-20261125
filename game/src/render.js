// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// kitchen is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Every dish is drawn from flat canvas shapes — no images, no borrowed art.
// Text that holds a number is rebuilt only when the number changes, so a frame allocates
// nothing.

import { FIELD, FONT, HEARTS, INGREDIENTS, LAYOUT, PALETTE, RECIPES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, lines and prompt. */
const PANEL = { width: 780, top: 150, line: 32, bottom: 76 };
const BIN_COUNT = INGREDIENTS.length;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

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

function recipeById(id) {
  return RECIPES.find((entry) => entry.id === id) ?? null;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const comboLabel = cachedLabel('Combo x');
  const levelLabel = cachedLabel('Level ');
  const servedLabel = cachedLabel('Served ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight ?? ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ?? ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  // -- Food -----------------------------------------------------------------
  // Each ingredient drawn at (x, y) as its centre, about `size` wide. `variant`
  // is 'raw' | 'cooked' | 'burnt' for the patty; other ingredients ignore it.

  function drawFood(id, x, y, size, variant) {
    const half = size / 2;
    if (id === 'bun') {
      context.fillStyle = '#e8b06a';
      context.beginPath();
      context.arc(x, y + half * 0.25, half, Math.PI, 0);
      context.fill();
      context.fillStyle = '#d99a4e';
      context.fillRect(x - half, y + half * 0.25, size, half * 0.35);
      context.fillStyle = '#fff3d0';
      for (const [dx, dy] of [[-0.4, -0.45], [0, -0.6], [0.4, -0.45], [-0.2, -0.25], [0.25, -0.3]]) {
        context.beginPath();
        context.arc(x + dx * size, y + dy * size, size * 0.045, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'patty') {
      context.fillStyle = variant === 'burnt' ? '#1c1410' : variant === 'raw' ? '#c96a5e' : '#7a4426';
      roundRect(context, x - half, y - half * 0.45, size, half * 0.9, size * 0.18);
      context.fill();
      if (variant === 'cooked') {
        context.fillStyle = '#5d3018';
        for (const dx of [-0.5, 0, 0.5]) {
          context.fillRect(x + dx * size - size * 0.05, y - half * 0.3, size * 0.1, half * 0.6);
        }
      }
    } else if (id === 'cheese') {
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.moveTo(x - half, y + half * 0.5);
      context.lineTo(x + half, y + half * 0.5);
      context.lineTo(x + half, y - half * 0.5);
      context.closePath();
      context.fill();
      context.fillStyle = '#e0a92e';
      for (const [dx, dy] of [[-0.3, 0.15], [0.1, -0.1], [0.35, 0.25]]) {
        context.beginPath();
        context.arc(x + dx * size, y + dy * size, size * 0.07, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'tomato') {
      context.fillStyle = '#e5534b';
      context.beginPath();
      context.arc(x, y, half * 0.95, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f28a84';
      context.beginPath();
      context.arc(x - half * 0.3, y - half * 0.35, half * 0.3, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#58b368';
      context.beginPath();
      context.arc(x, y - half * 0.85, half * 0.28, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'lettuce') {
      context.fillStyle = '#58b368';
      for (const [dx, dy, r] of [[-0.35, 0.1, 0.42], [0.35, 0.1, 0.42], [0, -0.25, 0.45]]) {
        context.beginPath();
        context.arc(x + dx * size, y + dy * size, r * size * 0.5, 0, Math.PI * 2);
        context.fill();
      }
      context.strokeStyle = '#3d8f4e';
      context.lineWidth = size * 0.05;
      context.beginPath();
      context.moveTo(x, y - half * 0.5);
      context.lineTo(x, y + half * 0.5);
      context.stroke();
    } else if (id === 'egg') {
      context.fillStyle = '#fdfdf4';
      context.beginPath();
      context.ellipse(x, y, half, half * 0.75, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f7b733';
      context.beginPath();
      context.arc(x, y, half * 0.42, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd964';
      context.beginPath();
      context.arc(x - half * 0.12, y - half * 0.12, half * 0.15, 0, Math.PI * 2);
      context.fill();
    }
  }

  // -- Kitchen ---------------------------------------------------------------

  function drawWallAndFloor() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 330);
    context.fillStyle = PALETTE.wallTile;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 80 + (row % 2) * 40, row * 80, 80, 80);
      }
    }
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 330, FIELD.width, FIELD.height - 330);
    context.fillStyle = PALETTE.floorDark;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        if ((row + col) % 2 === 0) context.fillRect(col * 80 + (row % 2) * 40, 330 + row * 78, 80, 78);
      }
    }
    // The long wooden counter the stations sit on.
    context.fillStyle = PALETTE.counterEdge;
    context.fillRect(296, 300, 984, 232);
    context.fillStyle = PALETTE.counter;
    context.fillRect(304, 308, 968, 216);
  }

  function drawBurner(cx, cy, radius, item, progress, cookSeconds, burnSeconds, label) {
    context.fillStyle = PALETTE.burner;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#4a4f5c';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
    if (item) {
      // A live flame ring while it cooks.
      if (progress < cookSeconds) {
        context.strokeStyle = PALETTE.flame;
        context.lineWidth = 5;
        context.beginPath();
        context.arc(cx, cy, radius + 8, 0, Math.PI * 2);
        context.stroke();
      }
      const variant = progress >= burnSeconds ? 'burnt' : progress >= cookSeconds ? 'cooked' : 'raw';
      drawFood(item, cx, cy, radius * 1.5, variant);
      // Cooking progress as a ring around the burner.
      const fraction = Math.min(1, progress / cookSeconds);
      context.strokeStyle = progress >= burnSeconds ? PALETTE.accent : PALETTE.gold;
      context.lineWidth = 6;
      context.beginPath();
      context.arc(cx, cy, radius + 16, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
      context.stroke();
    }
    text(label, cx, cy + radius + 34, 16, PALETTE.textLight, 'center');
  }

  function drawStove(state) {
    const box = LAYOUT.stove;
    context.fillStyle = PALETTE.stove;
    roundRect(context, box.x, box.y, box.width, box.height, 12);
    context.fill();
    text('STOVE', box.x + box.width / 2, box.y + 30, 18, PALETTE.textLight, 'center', 'bold ');
    const grill = state.grill;
    drawBurner(box.x + 78, box.y + 108, 46, grill.kind, grill.progress, 4, 9, grill.state === 'empty' ? 'Grill — empty' : grill.state === 'done' ? 'Patty ready!' : grill.state === 'burnt' ? 'Burnt!' : 'Grilling…');
    const pan = state.pan;
    drawBurner(box.x + 222, box.y + 108, 46, pan.kind, pan.progress, 3, 7, pan.state === 'empty' ? 'Pan — empty' : pan.state === 'done' ? 'Egg ready!' : pan.state === 'burnt' ? 'Burnt!' : 'Frying…');
  }

  function drawBoardStation(state) {
    const box = LAYOUT.boardStation;
    context.fillStyle = '#e8c99a';
    roundRect(context, box.x, box.y, box.width, box.height, 12);
    context.fill();
    context.strokeStyle = '#c9a06a';
    context.lineWidth = 3;
    roundRect(context, box.x + 8, box.y + 8, box.width - 16, box.height - 16, 8);
    context.stroke();
    text('CHOPPING BOARD', box.x + box.width / 2, box.y + 30, 18, PALETTE.text, 'center', 'bold ');
    const board = state.board;
    if (board.kind) {
      drawFood(board.kind, box.x + box.width / 2, box.y + 108, 92);
      // Chop marks: one slash per chop landed.
      context.strokeStyle = PALETTE.text;
      context.lineWidth = 4;
      for (let chop = 0; chop < board.chops; chop += 1) {
        const x = box.x + box.width / 2 - 30 + chop * 30;
        context.beginPath();
        context.moveTo(x - 12, box.y + 78);
        context.lineTo(x + 12, box.y + 138);
        context.stroke();
      }
      text(board.chops >= 2 ? 'Chopped!' : `Chop ${2 - board.chops} more`, box.x + box.width / 2, box.y + 182, 16, PALETTE.text, 'center');
    } else {
      text('Click a tomato or lettuce', box.x + box.width / 2, box.y + 100, 16, PALETTE.muted, 'center');
      text('to chop it here', box.x + box.width / 2, box.y + 124, 16, PALETTE.muted, 'center');
    }
  }

  function drawPlateStation(state) {
    const box = LAYOUT.plate;
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(box.x + box.width / 2, box.y + 108, 132, 62, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.plateRim;
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(box.x + box.width / 2, box.y + 108, 132, 62, 0, 0, Math.PI * 2);
    context.stroke();
    // The dish, stacked from the bottom up: each item sits a little higher.
    const cx = box.x + box.width / 2;
    for (let index = 0; index < state.plate.length; index += 1) {
      drawFood(state.plate[index], cx, box.y + 108 - index * 13, 74);
    }
    if (state.plate.length === 0) {
      text('Empty plate', cx, box.y + 112, 17, PALETTE.muted, 'center');
    }
    text('PLATE', cx, box.y + 30, 18, PALETTE.text, 'center', 'bold ');
    const selected = state.tickets.find((entry) => entry.selected) ?? state.tickets[0];
    if (selected && state.plate.length > 0 && sameDish(state.plate, selected.needs)) {
      context.fillStyle = PALETTE.serveReady;
      roundRect(context, cx - 110, box.y + 158, 220, 30, 15);
      context.fill();
      text('READY TO SERVE!', cx, box.y + 180, 18, '#12351c', 'center', 'bold ');
    } else if (selected) {
      text(`Building: ${selected.name}`, cx, box.y + 180, 16, PALETTE.textLight, 'center');
    }
  }

  // -- Order board -----------------------------------------------------------

  function drawTicket(ticket, x, y, width, height) {
    const urgent = ticket.left < 12;
    context.fillStyle = ticket.selected ? PALETTE.ticketSelected : urgent ? PALETTE.ticketUrgent : PALETTE.ticket;
    roundRect(context, x, y, width, height, 10);
    context.fill();
    context.strokeStyle = ticket.selected ? PALETTE.gold : '#d8c9a3';
    context.lineWidth = ticket.selected ? 4 : 2;
    roundRect(context, x, y, width, height, 10);
    context.stroke();
    text(ticket.selected ? `▶ ${ticket.name}` : ticket.name, x + 14, y + 26, 19, PALETTE.text, 'left', 'bold ');
    const recipe = recipeById(ticket.recipeId);
    const needs = recipe ? recipe.needs : ticket.needs;
    for (let index = 0; index < needs.length; index += 1) {
      drawFood(needs[index], x + 34 + index * 52, y + 62, 42);
    }
    // The countdown bar under the recipe.
    const barWidth = width - 28;
    context.fillStyle = '#e3d5b3';
    context.fillRect(x + 14, y + height - 24, barWidth, 10);
    context.fillStyle = urgent ? PALETTE.accent : PALETTE.green;
    context.fillRect(x + 14, y + height - 24, barWidth * Math.max(0, ticket.left / ticket.total), 10);
    text(`${Math.ceil(ticket.left)}s`, x + width - 14, y + height - 28, 15, PALETTE.text, 'right');
  }

  function drawOrderBoard(state) {
    const box = LAYOUT.board;
    context.fillStyle = PALETTE.boardPanel;
    roundRect(context, box.x, box.y, box.width, box.height, 12);
    context.fill();
    text('ORDER BOARD', box.x + box.width / 2, box.y + 32, 22, PALETTE.textLight, 'center', 'bold ');
    if (state.tickets.length === 0) {
      text('No orders right now…', box.x + box.width / 2, box.y + 90, 17, PALETTE.muted, 'center');
    }
    for (let index = 0; index < state.tickets.length; index += 1) {
      drawTicket(state.tickets[index], box.x + 12, box.y + 52 + index * 120, box.width - 24, 112);
    }
    text('Click a ticket to cook it', box.x + box.width / 2, box.y + box.height - 16, 15, PALETTE.muted, 'center');
  }

  // -- Ingredient bins, serve and trash --------------------------------------

  function drawBins() {
    const bins = LAYOUT.bins;
    const binWidth = (bins.width - (BIN_COUNT - 1) * bins.gap) / BIN_COUNT;
    text('INGREDIENTS', bins.x, bins.y - 12, 16, PALETTE.textLight, 'left', 'bold ');
    for (let index = 0; index < BIN_COUNT; index += 1) {
      const ingredient = INGREDIENTS[index];
      const x = bins.x + index * (binWidth + bins.gap);
      const y = bins.y;
      context.fillStyle = '#fdf3d8';
      roundRect(context, x, y, binWidth, bins.height, 12);
      context.fill();
      context.strokeStyle = '#d8c9a3';
      context.lineWidth = 2;
      roundRect(context, x, y, binWidth, bins.height, 12);
      context.stroke();
      drawFood(ingredient.id, x + binWidth / 2, y + 48, 56);
      text(ingredient.name, x + binWidth / 2, y + 96, 16, PALETTE.text, 'center', 'bold ');
      text(`[${ingredient.key}]`, x + binWidth / 2, y + 116, 14, PALETTE.muted, 'center');
    }
  }

  function drawServeButton(state) {
    const button = LAYOUT.serve;
    const selected = state.tickets.find((entry) => entry.selected) ?? state.tickets[0];
    const ready = selected && state.plate.length > 0 && sameDish(state.plate, selected.needs);
    context.fillStyle = ready ? PALETTE.serveReady : PALETTE.serve;
    roundRect(context, button.x, button.y, button.width, button.height, 14);
    context.fill();
    context.strokeStyle = ready ? '#ffffff' : PALETTE.greenDark;
    context.lineWidth = ready ? 4 : 3;
    roundRect(context, button.x, button.y, button.width, button.height, 14);
    context.stroke();
    text('SERVE', button.x + button.width / 2, button.y + 46, 30, '#ffffff', 'center', 'bold ');
    text('[Space]', button.x + button.width / 2, button.y + 76, 16, '#e8f5e9', 'center');
    const trash = LAYOUT.trash;
    context.fillStyle = PALETTE.trash;
    roundRect(context, trash.x, trash.y, trash.width, trash.height, 8);
    context.fill();
    text('Trash plate  [T]', trash.x + trash.width / 2, trash.y + 22, 15, '#ffffff', 'center');
  }

  // -- HUD and messages ------------------------------------------------------

  function drawHud(state) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, LAYOUT.hudHeight);
    text('SIZZLE & SERVE', 20, 42, 28, PALETTE.gold, 'left', 'bold ');
    // The shift clock: a bar plus the time left.
    const barX = 330;
    const barWidth = 420;
    context.fillStyle = '#4a382a';
    context.fillRect(barX, 22, barWidth, 20);
    const fraction = Math.max(0, state.shiftLeft / 150);
    context.fillStyle = fraction < 0.2 ? PALETTE.accent : PALETTE.gold;
    context.fillRect(barX, 22, barWidth * fraction, 20);
    const minutes = Math.floor(state.shiftLeft / 60);
    const seconds = Math.floor(state.shiftLeft % 60);
    text(`SHIFT ${minutes}:${String(seconds).padStart(2, '0')}`, barX + barWidth / 2, 39, 17, PALETTE.textLight, 'center', 'bold ');
    text(scoreLabel(state.score), 790, 42, 24, PALETTE.textLight, 'left');
    text(comboLabel(state.combo), 930, 42, 24, state.combo >= 2 ? PALETTE.gold : PALETTE.muted, 'left', 'bold ');
    // Hearts sit between the combo and the level, clear of both.
    for (let heart = 0; heart < HEARTS; heart += 1) {
      const cx = 1078 + heart * 26;
      context.fillStyle = heart < state.hearts ? PALETTE.accent : '#4a382a';
      context.beginPath();
      context.arc(cx - 6, 30, 7, 0, Math.PI * 2);
      context.arc(cx + 6, 30, 7, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(cx - 12, 32);
      context.lineTo(cx, 46);
      context.lineTo(cx + 12, 32);
      context.closePath();
      context.fill();
    }
    text(levelLabel(state.level), 1160, 42, 24, PALETTE.textLight, 'left');
  }

  function drawMessage(state) {
    if (!state.message) return;
    context.fillStyle = 'rgba(46, 33, 24, 0.92)';
    roundRect(context, FIELD.width / 2 - 260, 532, 520, 34, 17);
    context.fill();
    text(state.message, FIELD.width / 2, 556, 18, PALETTE.textLight, 'center');
  }

  function drawHint() {
    text('1–6 add ingredients · Click the stove, board and plate · Space serves · C collects · T trashes · P pauses', FIELD.width / 2, 710, 15, PALETTE.muted, 'center');
  }

  // -- Panels ----------------------------------------------------------------

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 14, 8, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 3;
    roundRect(context, x, y, PANEL.width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.panelText, 'center', 'bold ');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 19, '#cfc4b0', 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Orders come in on the board — cook each dish',
    'before its timer runs out.',
    'Grill the patty, fry the egg, chop the tomato and lettuce,',
    'stack it all on the plate and SERVE. Three missed orders end the shift.',
    'Keys 1–6 pick ingredients · Space serves · C collects · T trashes · P pauses',
    '',
  ];
  const PAUSED_LINES = ['The stove will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWallAndFloor();
    drawOrderBoard(state);
    drawStove(state);
    drawBoardStation(state);
    drawPlateStation(state);
    drawBins();
    drawServeButton(state);
    drawHint();
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('Sizzle & Serve', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    drawMessage(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = servedLabel(state.served);
      OVER_LINES[2] = `Best combo x${state.bestCombo} · ${bestLabel(best)}`;
      drawPanel('Shift over!', OVER_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
