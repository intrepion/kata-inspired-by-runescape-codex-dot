# Research and fidelity: Embervale

Research date: 2026-11-06. Target: the **Old School RuneScape** starter experience, not modern RuneScape's ability-bar combat. This is a bounded, original single-player study, not exact whole-game replication.

## Gameplay summary

RuneScape is a player-directed fantasy role-playing world. The player chooses skills, combat, quests and exploration rather than following one fixed campaign. Gathering creates materials; processing creates equipment and consumables; XP improves skills and unlocks activities. Banking, inventory capacity and trading connect these loops. Quests add dialogue, exploration, item requirements and rewards. The full games also have shared worlds and player economies, which cannot be represented by a static single-player shop.

Official orientation: [Jagex RuneScape overview](https://www.jagex.com/runescape), [RuneScape skills](https://www.runescape.com/game-guide/skills), [RuneScape game information](https://www.runescape.com/game-info), and [Old School RuneScape on Steam](https://store.steampowered.com/app/1343370/Old_School_RuneScape/).

## Source-linked mechanics matrix

| System | Reference | Embervale implementation |
| --- | --- | --- |
| Time | [Game tick](https://oldschool.runescape.wiki/w/Game_tick): 0.6 seconds | 600 ms model tick; real-time animation interpolates movement. Dialogs and hidden tabs pause this solo world. |
| Inventory | [Inventory](https://oldschool.runescape.wiki/w/Inventory): 28 spaces; stackability matters | Exactly 28 slots; coins/seals stack, individual resources/tools occupy slots. Bank stacks all items. No noted items or containers. |
| Progression | [Experience](https://oldschool.runescape.wiki/w/Experience) and [Skills](https://oldschool.runescape.wiki/w/Skill): classic threshold formula | Same 1–99 formula: level 2 = 83, 10 = 1,154, 15 = 2,411, 99 = 13,034,431. Eleven selected skills, not the entire roster. |
| Woodcutting | [Trees](https://oldschool.runescape.wiki/w/Trees), [Woodcutting](https://oldschool.runescape.wiki/w/Woodcutting): normal 25 XP, oak level 15 and 37.5 XP; ordinary tree one log, oak 45-tick active timer | Matching levels/rewards and one-log normal trees. Oak uses 45 active ticks. Bronze axe required in backpack. Local fixed success probability and 20-tick regrowth; no full forestry/axe tables. |
| Firemaking | [Trees](https://oldschool.runescape.wiki/w/Trees): logs 40 XP, oak level 15 and 60 XP | Matching reward and oak gate, tinderbox required. Ignition is immediate; 100-tick fire lifetime and location handling are simplified. |
| Mining | [Copper ore](https://oldschool.runescape.wiki/w/Copper_ore), [Tin ore](https://oldschool.runescape.wiki/w/Tin_ore): level 1, 17.5 XP | Matching rewards, pickaxe requirement, depletion. Fixed local 80% attempt chance and four-tick respawn, not the full level/pickaxe success formula. |
| Bronze smelting | [Bars](https://oldschool.runescape.wiki/w/Bar): bronze requires copper + tin, 6.2 XP | Same ingredients and reward, furnace required, repeating three-tick processing. Only bronze is included. |
| Smithing | [Smithing experience table](https://oldschool.runescape.wiki/w/Smithing/Experience_table): bronze dagger, 1 bar, hammer, anvil, level 1, 12.5 XP | Same input/tool/reward. Repeating five-tick processing; one forgeable recipe. |
| Fishing | [Raw shrimps](https://oldschool.runescape.wiki/w/Raw_shrimps): small net, level 1, 10 XP | Same tool and XP. Five-tick attempts with fixed 70% success, stationary fishing spots and no anchovies. These rates are approximations. |
| Cooking | [Shrimps](https://oldschool.runescape.wiki/w/Shrimps): 30 XP on success, heal 3, normal fire/range success table reaches 100% at level 34 | Matching rewards/healing and source-table success numerators for levels 1–34. Four-tick cooking. No special Lumbridge/Hosidius range bonuses. |
| Combat | [Combat Options](https://oldschool.runescape.wiki/w/Rapid), [Dagger](https://oldschool.runescape.wiki/w/Dagger), [Attack speed](https://oldschool.runescape.wiki/w/Attack_speed) | Four-tick bronze weapon interval. Accurate/aggressive/defensive yield 4 XP per actual damage to Attack/Strength/Defence; Hitpoints receives 1.33. Basic strength maximum follows the classic shape, but accuracy/equipment/enemy defence are simplified. No ranged/magic or combat triangle. |
| Prayer | [Bones](https://oldschool.runescape.wiki/w/Bones) | Bury bones for 4.5 XP; altar restores stored prayer points. Active prayers and their bonuses/drain are not implemented. |
| Quests | Official game descriptions above | Three entirely original quests with item/kill requirements and rewards. No copied quest text, narrative, characters or objectives asserted as exact original quests. |
| Economy | Official game descriptions above | Fixed-price NPC shop, local coins and bank. No player market, Grand Exchange, stock changes or trading. |

The wiki's direct page fetches were restricted by robots.txt during research. Search-indexed excerpts supplied the cited mechanics, numerical tables and page URLs. The source research is not a live empirical audit of the entire current game. Exact implementation claims above are limited to the listed parameters, not the whole associated system.

## Explicit differences

- Original 36 × 28 tile valley; original names, geometry, interface and quests. No copied map, art, audio, code or Jagex text.
- Single-player local save, not a multiplayer world or authoritative network server. Pauses and no offline progression are intentional.
- Eleven skills rather than every current OSRS skill. One basic gathering/crafting tier, plus oak at level 15. No complete unlock catalogue.
- Run energy uses a flat drain/recovery rather than weight/Agility calculations. Eight-way navigation and click-to-interact are retained; objects use forgiving adjacent range.
- Basic enemy stats, loot, shop economy and quest rewards are original balancing. Enemies are stationary until selected and do not use authentic aggression/leash tables. Only the latest defeated enemy's loot pile is retained; collect it before another kill.
- Combat shows hit splats and target HP but does not reproduce every accuracy, attack-type, special attack, regeneration, equipment or timing exception. Defensive and aggressive style bonuses are simplified.
- Death returns to the village, keeps equipment/items and removes 10% of carried coins. This is **not** OSRS gravestones/death storage/protected-item behavior.
- Food has a three-tick eating cooldown. Firemaking ignition and bank/shop interactions are intentionally simplified.
- No PvP, multiplayer chat, Grand Exchange, active prayer bonuses, magic, ranged combat, minigames, bosses, membership or full quest catalogue.

## Original implementation and licensing

Only functional facts and brief paraphrases were used. Research sources remain their owners' work. All environment and character models are generated from original primitive geometry. Code/procedural assets are MIT, with the Three.js MIT notice distributed. RuneScape is a Jagex trademark; there is no affiliation or endorsement.
