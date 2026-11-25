# Sizzle & Serve — a cooking game

[![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/freysiatiara/cooking-game-20261125/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/freysiatiara/cooking-game-20261125/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

An original cooking game built for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137).

## The game

Orders come in on the board — cook each dish before its timer runs out. Grill the
patty, fry the egg, chop the tomato and lettuce, stack it all on the plate and
SERVE. Three missed orders end the shift; every four dishes served raises the
level and the kitchen gets busier.

- **Play it:** serve `game/` with any static server and open `game/index.html` in
  desktop Chrome. No build step, no network request, no libraries.
- **Controls:** click the ingredient bins, the stove, the chopping board, a ticket
  or the SERVE button — or use keys `1–6` for ingredients, `Space` to serve,
  `C` to collect, `T` to trash the plate, `P` to pause.
- **Menu:** Sunny Burger, Garden Bowl, Sunrise Plate, Double Stack, Melty Toast.
  Combos grow with every dish served in a row; a wrong serve or a burnt
  ingredient breaks the combo.
- **Sound:** a few WebAudio beeps (chop, sizzle-ready, serve ding) — no audio files.

## Layout

- `game/index.html` — the page, canvas only.
- `game/src/config.js` — tuning, recipes, palette, layout.
- `game/src/world.js` — the rules: orders, grill, pan, board, plate, score.
- `game/src/render.js` — all drawing: kitchen, food, tickets, HUD, panels.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/audio.js` — WebAudio beeps.
- `game/src/shots.js` — the three deterministic screenshot scenes.
- `game/src/random.js` — seeded random for repeatable orders.
- `game/src/main.js` — boot and the game loop.
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with the vendored make.fun library.

## Screenshots

`?shot=start&seed=1` stages the title over the kitchen, `?shot=play&seed=1` a dish
mid-assembly with the timer running, `?shot=end&seed=1` a plate ready to serve.
