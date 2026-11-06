# Embervale

**A small world. A long adventure.** An original, single-player 3D skill adventure inspired by the early-game rhythms of **Old School RuneScape**.

[Play Embervale](https://intrepion.github.io/kata-inspired-by-runescape-codex-dot/) · [Back to Kata Arcade](https://intrepion.github.io/) · [Research & fidelity](docs/RESEARCH.md)

Point, click, and make a life in a little river valley. Cut trees, mine copper and tin, smelt bronze, forge equipment, catch and cook supper, bank resources, trade with the village shop, and venture across the bridge to fight goblins. Eleven skills use persistent XP and the familiar level 1–99 curve. Three original quests connect the activities without forcing a linear route.

## The gameplay

- **Point-and-click tile travel:** an eight-direction route finder respects water, buildings, diagonal corners, and the river bridge. Walk one tile per 600 ms tick, or run up to two while spending energy.
- **A 28-slot backpack:** logs, ores, food and equipment occupy individual slots. Coins stack. The bank stacks all items, and withdrawals still respect backpack space. Tools must be carried.
- **Skills through use:** Woodcutting, Firemaking, Fishing, Cooking, Mining, Smithing, Attack, Strength, Defence, Hitpoints and Prayer. Activity rewards and the classic XP curve are documented in the research matrix.
- **Production chains:** copper + tin → bronze bar → bronze dagger. Net shrimps → cook at a range or player-made fire → eat to restore 3 HP. Chop logs → light with a tinderbox → Firemaking XP. Bury dropped bones for Prayer XP.
- **Melee combat:** select a creature and auto-attack on a four-tick weapon cycle. Accurate, Aggressive and Defensive styles train Attack, Strength and Defence respectively. Damage also trains Hitpoints. Equipment affects rolls. Walk away to disengage, eat to heal, collect dropped coins and bones.
- **Local economy and progression:** sell goods, buy supplies and equipment, bank resources, earn quest rewards, unlock oak gathering at Woodcutting 15, and save your progress in this browser.

### Start here

1. Click **Warden Elowen** or her button under Around the valley. Accept a quest.
2. Mine one **Copper rock** and one **Tin rock**. Walk to the **Foundry furnace**, then the **Smith’s anvil**. Bring the forged dagger to Elowen.
3. Try a **Net fishing spot**, then the **Cooking range**. Bring three cooked shrimps for the hearth quest, and keep extra food for combat.
4. Fight a **Giant rat** before crossing the bridge to the stronger mire goblins. Pick up loot after every kill.

### Controls

- Click/tap the ground to walk. Click an object to walk into range and use it.
- **Around the valley** buttons perform the same travel and action, not a teleport.
- Click backpack items to eat, equip, bury bones or light logs. **Shift-click** drops an item.
- **R:** toggle run. **Space:** stop the current action when focus is not on a button/link.
- **Q/E:** rotate the camera. **+/−**, mouse wheel or on-screen controls: zoom.
- **Escape:** close a dialog or pause. **Pause** saves and freezes the world.
- The optional **Sound** toggle enables locally synthesized XP tones, off by default.

Dialogs and hidden tabs pause the world. There is no offline progression. Progress autosaves every ten active ticks, on inventory/shop/quest actions, on pause and on page exit. Reloading resumes your character, skills, items and quests, but not active actions or transient loot. Storage is local to this browser and device. Clearing site data or choosing Reset adventure removes it. No account, analytics, payments, or multiplayer service is used.

## Scope and fidelity

This is a **bounded reconstruction of selected Old School RuneScape mechanics, not an exact copy of the complete game**. Modern RuneScape and Old School RuneScape differ substantially; this project deliberately targets the classic, point-and-click starter experience rather than modern ability-bar combat.

The 600 ms tick, 28-slot backpack, classic XP curve, core resource chain, specified XP rewards, food healing, melee training styles and four-tick bronze weapon interval are reproduced. The map, quests, NPC names, visual designs and interface are original. Gathering success probabilities, resource respawn choices, simplified combat/equipment tables, run energy, shop prices and death rules are local approximations. In this valley, death returns you to the village with your items and costs 10% of carried coins.

It does **not** reproduce the full MMORPG: no multiplayer, Grand Exchange, player trading, PvP, ranged/magic combat, complete prayer system, all skills, all equipment, all quests, large world, membership or exact economy. Prayer currently supports bones, XP and an altar but not active prayer bonuses. The [source-linked research matrix](docs/RESEARCH.md) identifies what is preserved and what differs.

Three.js supplies the real 3D landscape, lighting, shadows, picking and original procedural models. Gameplay is a separate deterministic tile/tick simulation. No Jagex code, artwork, models, music, text, logo or map is copied.

## Run and test

Requires Node.js 22.12+ or Node 24 and npm.

```sh
npm ci
npm run dev
# Open http://127.0.0.1:5230/
npm run check
npm test
npm run build
npm run preview
# Open http://127.0.0.1:5230/ (stop dev first)
```

**Always run a server and test gameplay through `http://127.0.0.1`. Never open HTML directly or use `file://`.** Vite uses a relative base for project-path GitHub Pages hosting. Three.js is bundled locally, with no runtime CDN dependency.

```sh
npx playwright install chromium
npm run test:browser
npm run capture:arcade
```

Both browser scripts start a production-build HTTP loopback server. Browser tests use public controls and real gameplay, while unit tests exercise the pure model. See [validation](docs/VALIDATION.md) for actual checks and their limits. GitHub Actions performs syntax, unit, build and Chromium gameplay checks before publishing to Pages.

## Screenshots

Game-owned screenshots and provenance live in `public/arcade/manifest.json` (Kata Arcade schema v3). Capture records include the source commit, served input hashes, timestamps, browser/tool versions, viewport and public-control steps. Original PNGs accompany unedited JPEGs. Captures are explicitly **local gameplay captures**, not CI output or claims of deployed-build equivalence. The workflow never injects a save, mutates game state or composites screenshot pixels. The Arcade syncs verified content-addressed copies of the game-owned images.

## Structure

- `src/game.js`: deterministic ticks, pathfinding, inventory, skills, production, combat, quests and save validation.
- `src/scene.js`: procedural Three.js models, terrain, camera, lighting and picking.
- `src/main.js`, `src/style.css`: responsive UI, input, dialogs, accessible travel controls and storage.
- `tests/`: deterministic mechanics and screenshot-integrity regressions.
- `scripts/`: HTTP browser QA and screenshot capture.
- `docs/`: research, scope and validation.
- `.github/workflows/deploy.yml`: checks and GitHub Pages deployment.

## License and acknowledgments

MIT, copyright 2026 Oliver Forral. Original code and procedural assets are covered by the license. Three.js is MIT-licensed; its notice is included in [public/licenses/three-LICENSE.txt](public/licenses/three-LICENSE.txt).

RuneScape and Old School RuneScape are the work and trademarks of Jagex. This independent educational project is not affiliated with, sponsored by, or endorsed by Jagex.

The combined `.gitignore` contains Linux, Windows and macOS global templates from [github/gitignore](https://github.com/github/gitignore/tree/main/Global), plus Node/Vite build output, local environment files and test artifacts. The npm lockfile stays tracked.
