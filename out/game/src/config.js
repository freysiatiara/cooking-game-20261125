// Sizzle & Serve — every tuning number, colour and layout constant in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One full shift, in seconds: serve as many orders as you can before the clock runs out. */
export const SHIFT_SECONDS = 150;

export const HEARTS = 3;

/** Ingredients, in bin order. `prep` says what has to happen before it can reach the plate. */
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', prep: 'none', color: '#e8b06a' },
  { id: 'patty', name: 'Patty', key: '2', prep: 'grill', color: '#a05a3c' },
  { id: 'cheese', name: 'Cheese', key: '3', prep: 'none', color: '#f2c94c' },
  { id: 'tomato', name: 'Tomato', key: '4', prep: 'chop', color: '#e5534b' },
  { id: 'lettuce', name: 'Lettuce', key: '5', prep: 'chop', color: '#58b368' },
  { id: 'egg', name: 'Egg', key: '6', prep: 'fry', color: '#f7e08a' },
];

/** Recipes on the menu: name, the ingredients in the order they are stacked, and the base pay. */
export const RECIPES = [
  { id: 'sunny-burger', name: 'Sunny Burger', needs: ['bun', 'patty', 'cheese', 'tomato'], pay: 100 },
  { id: 'garden-bowl', name: 'Garden Bowl', needs: ['lettuce', 'tomato', 'cheese'], pay: 80 },
  { id: 'sunrise-plate', name: 'Sunrise Plate', needs: ['egg', 'lettuce', 'tomato'], pay: 90 },
  { id: 'double-stack', name: 'Double Stack', needs: ['bun', 'patty', 'patty', 'cheese'], pay: 140 },
  { id: 'melty-toast', name: 'Melty Toast', needs: ['bun', 'cheese', 'egg'], pay: 90 },
];

export const GRILL = { cookSeconds: 4, burnSeconds: 9 };
export const PAN = { cookSeconds: 3, burnSeconds: 7 };
export const BOARD = { chopsNeeded: 2 };

/** How many items the plate can hold at once. */
export const PLATE_CAPACITY = 5;

/** Orders: how often a new ticket appears, how long it lives, and how many can wait. */
export const ORDERS = {
  firstAtSeconds: 1,
  spawnInterval: 16,
  spawnIntervalPerLevel: -1.2,
  minSpawnInterval: 8,
  ticketSeconds: 48,
  ticketSecondsPerLevel: -2,
  minTicketSeconds: 30,
  maxTickets: 3,
};

/** A level every N served orders: the kitchen gets busier and the tickets shorter. */
export const LEVEL = { servesPerLevel: 4, max: 8 };

export const SCORING = {
  /** Points per second left on the ticket when a dish is served. */
  timeBonusPerSecond: 5,
  /** Points per combo step, paid on top of the dish. */
  comboPerStep: 25,
};

/** A wrong serve or a burnt ingredient breaks the combo and costs this many points. */
export const MISTAKE_PENALTY = 15;

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#f3e2c2',
  wallTile: '#ecd9ae',
  floor: '#8a5a3b',
  floorDark: '#7a4e33',
  counter: '#b07a45',
  counterEdge: '#8f6236',
  boardPanel: '#3d2b1f',
  boardPaper: '#fdf3d8',
  ticket: '#fff8e1',
  ticketSelected: '#ffe9a8',
  ticketUrgent: '#f7c6c0',
  text: '#2b2118',
  textLight: '#fdf3d8',
  muted: '#8b7d6b',
  hud: '#2e2118',
  accent: '#e5534b',
  gold: '#f2c94c',
  green: '#58b368',
  greenDark: '#3d8f4e',
  stove: '#3a3f4a',
  stoveTop: '#23262e',
  burner: '#14161c',
  flame: '#ff9f2e',
  plate: '#f6f2e8',
  plateRim: '#d8d2c2',
  serve: '#58b368',
  serveReady: '#7ed491',
  trash: '#8b7d6b',
  panel: '#2e2118',
  panelText: '#fdf3d8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';

/** Layout of the kitchen, in logical pixels. */
export const LAYOUT = {
  hudHeight: 64,
  board: { x: 16, y: 80, width: 272, height: 440 },
  stove: { x: 312, y: 320, width: 300, height: 200 },
  boardStation: { x: 640, y: 320, width: 260, height: 200 },
  plate: { x: 928, y: 320, width: 336, height: 200 },
  bins: { x: 312, y: 560, width: 700, height: 128, gap: 10 },
  serve: { x: 1040, y: 576, width: 224, height: 96 },
  trash: { x: 1040, y: 680, width: 224, height: 32 },
};
