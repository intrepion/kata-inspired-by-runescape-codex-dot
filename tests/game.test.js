import test from "node:test";
import assert from "node:assert/strict";
import * as g from "../src/game.js";
const fresh = (seed = 1) => g.createGame(seed);
const act = (s, id) => {
  const n = g.NODES.find((n) => n.id === id);
  s.p.x = n.x - 1;
  s.p.y = n.y;
  s.action = { id, wait: 0 };
  s.path = [];
  g.tick(s);
};
const item = (s, id) => s.inventory.findIndex((v) => v.id === id);
const seedFor = (predicate) => {
  for (let seed = 1; seed < 100000; seed++) {
    const s = fresh(seed);
    if (predicate(s)) return seed;
  }
  throw Error("No matching deterministic seed");
};

test("OSRS XP table has exact level thresholds and 99 cap", () => {
  assert.equal(g.XP.length, 99);
  assert.equal(g.XP[1], 83);
  assert.equal(g.XP[9], 1154);
  assert.equal(g.XP[98], 13034431);
  assert.equal(g.level(82), 1);
  assert.equal(g.level(83), 2);
  assert.equal(g.level(1154), 10);
  assert.equal(g.level(200000000), 99);
});
test("seeded RNG is reproducible and bounded", () => {
  const a = fresh(45),
    b = fresh(45);
  for (let i = 0; i < 100; i++) {
    const n = g.random(a);
    assert.equal(n, g.random(b));
    assert.ok(n >= 0 && n < 1);
  }
});
test("ticks are 600ms and walking moves exactly one tile per tick", () => {
  const s = fresh();
  assert.equal(g.TICK_MS, 600);
  assert.ok(g.walk(s, 20, 17));
  assert.equal(s.path.length, 4);
  g.tick(s);
  assert.deepEqual([s.p.x, s.p.y, s.tick], [17, 17, 1]);
  assert.equal(s.path.length, 3);
});
test("running moves two tiles and drains energy; depleted run falls back to walking", () => {
  const s = fresh();
  s.p.run = true;
  g.walk(s, 20, 17);
  g.tick(s);
  assert.equal(s.p.x, 18);
  assert.equal(s.p.energy, 99);
  s.p.energy = 0;
  g.tick(s);
  assert.equal(s.p.x, 19);
});
test("river routes use bridge and every diagonal avoids corner cutting", () => {
  const s = fresh();
  const path = g.route(s, 32, 10);
  assert.ok(path.length);
  let prev = s.p;
  for (const p of path) {
    assert.ok(g.walkable(p.x, p.y));
    if (p.x >= 25 && p.x <= 27) assert.ok([13, 14].includes(p.y));
    if (p.x !== prev.x && p.y !== prev.y) {
      assert.ok(g.walkable(p.x, prev.y));
      assert.ok(g.walkable(prev.x, p.y));
    }
    prev = p;
  }
  assert.deepEqual(path.at(-1), { x: 32, y: 10 });
  assert.equal(g.route(s, 26, 20), null);
  assert.equal(g.route(s, 0, 0), null);
});
test("building detour cannot cut its corners", () => {
  const s = fresh();
  s.p.x = 10;
  s.p.y = 6;
  const path = g.route(s, 11, 5);
  assert.equal(path.length, 2);
  assert.deepEqual(path[0], { x: 10, y: 5 });
});
test("pause freezes ticks and stop cancels interaction", () => {
  const s = fresh();
  g.walk(s, 20, 17);
  s.paused = true;
  g.tick(s);
  assert.equal(s.tick, 0);
  assert.equal(s.p.x, 16);
  g.stop(s);
  assert.equal(s.path.length, 0);
  assert.equal(s.action, null);
});
test("inventory allows 28 slots and coins stack without extra slots", () => {
  const s = fresh();
  const space = 28 - s.inventory.length;
  assert.ok(g.add(s, "logs", space));
  assert.equal(s.inventory.length, 28);
  assert.equal(g.add(s, "logs"), false);
  assert.equal(g.add(s, "shrimp", 2), false);
  assert.ok(g.add(s, "coins", 100));
  assert.equal(g.count(s, "coins"), 125);
  assert.equal(g.remove(s, "logs", space + 1), false);
  assert.equal(g.count(s, "logs"), space);
  assert.ok(g.remove(s, "logs", 2));
  assert.equal(s.inventory.length, 26);
});
test("unknown items are rejected; bank stacks resources", () => {
  const s = fresh();
  assert.equal(g.add(s, "fake"), false);
  assert.ok(g.add(s, "logs", 50, "bank"));
  assert.equal(s.bank.length, 1);
  assert.equal(g.count(s, "logs", "bank"), 50);
});
test("gathering requires appropriate backpack tools", () => {
  for (const [id, tool, skill] of [
    ["tree1", "axe", "Woodcutting"],
    ["copper1", "pickaxe", "Mining"],
    ["fish1", "net", "Fishing"],
  ]) {
    const s = fresh();
    g.remove(s, tool);
    act(s, id);
    assert.equal(s.action, null);
    assert.equal(s.skills[skill], 0);
    assert.match(s.logs.at(-1), /backpack/);
  }
});
test("successful chopping awards logs and XP and depletes deterministically", () => {
  const seed = seedFor((s) => g.random(s) < 0.65 && g.random(s) < 0.35);
  const s = fresh(seed);
  act(s, "tree1");
  assert.equal(g.count(s, "logs"), 1);
  assert.equal(s.skills.Woodcutting, 25);
  assert.equal(s.nodes.tree1.respawn, 21);
  assert.equal(s.action, null);
  assert.equal(g.interact(s, "tree1"), false);
  s.tick = 21;
  assert.equal(g.interact(s, "tree1"), true);
});
test("oak requires level 15", () => {
  const s = fresh();
  act(s, "oak");
  assert.equal(s.action, null);
  assert.equal(g.count(s, "oak"), 0);
  s.skills.Woodcutting = g.XP[14];
  s.seed = 1;
  act(s, "oak");
  assert.equal(g.count(s, "oak"), 1);
  assert.equal(s.skills.Woodcutting, g.XP[14] + 37.5);
});
test("mining awards ore and 17.5 XP with four-tick depletion", () => {
  for (const [node, id] of [
    ["copper1", "copper"],
    ["tin1", "tin"],
  ]) {
    const s = fresh();
    act(s, node);
    assert.equal(g.count(s, id), 1);
    assert.equal(s.skills.Mining, 17.5);
    assert.equal(s.nodes[node].respawn, 5);
    assert.equal(s.action, null);
  }
});
test("fishing awards shrimps and 10 XP; a full inventory grants no XP", () => {
  const s = fresh();
  act(s, "fish1");
  assert.equal(g.count(s, "raw"), 1);
  assert.equal(s.skills.Fishing, 10);
  const full = fresh();
  g.add(full, "logs", 28 - full.inventory.length);
  act(full, "fish1");
  assert.equal(full.skills.Fishing, 0);
  assert.equal(full.action, null);
});
test("bronze production consumes copper and tin then bar, grants fractional XP and craft credit", () => {
  const s = fresh();
  g.add(s, "copper");
  g.add(s, "tin");
  act(s, "furnace");
  assert.equal(g.count(s, "copper"), 0);
  assert.equal(g.count(s, "tin"), 0);
  assert.equal(g.count(s, "bar"), 1);
  assert.equal(s.skills.Smithing, 6.2);
  act(s, "anvil");
  assert.equal(g.count(s, "bar"), 0);
  assert.equal(g.count(s, "dagger"), 1);
  assert.equal(s.skills.Smithing, 18.7);
  assert.equal(s.crafted, 1);
  act(s, "anvil");
  assert.equal(s.action, null);
  assert.equal(s.crafted, 1);
});
test("cooking success and burn branches consume raw food and only success grants XP", () => {
  const s = fresh();
  g.add(s, "raw");
  g.cook(s);
  assert.equal(g.count(s, "raw"), 0);
  assert.equal(g.count(s, "shrimp"), 1);
  assert.equal(s.skills.Cooking, 30);
  const seed = seedFor((s) => g.random(s) >= 0.66);
  const burnt = fresh(seed);
  g.add(burnt, "raw");
  g.cook(burnt);
  assert.equal(g.count(burnt, "burnt"), 1);
  assert.equal(burnt.skills.Cooking, 0);
  burnt.skills.Cooking = g.XP[33];
  g.add(burnt, "raw");
  g.cook(burnt);
  assert.equal(g.count(burnt, "shrimp"), 1);
});
test("bank transfers require bank dialog and preserve items when backpack is full", () => {
  const s = fresh();
  assert.equal(g.transfer(s, "axe"), false);
  s.dialog = "bank";
  assert.ok(g.transfer(s, "axe"));
  assert.equal(g.count(s, "axe"), 0);
  assert.equal(g.count(s, "axe", "bank"), 1);
  const space = 28 - s.inventory.length;
  g.add(s, "logs", space);
  assert.equal(g.transfer(s, "axe", false), false);
  assert.equal(g.count(s, "axe", "bank"), 1);
  g.depositAll(s);
  assert.equal(s.inventory.length, 0);
  assert.equal(g.count(s, "logs", "bank"), space);
  assert.ok(g.transfer(s, "logs", false));
  assert.equal(g.count(s, "logs"), 1);
  assert.equal(g.count(s, "logs", "bank"), space - 1);
});
test("equipment swap preserves old weapon and works with full backpack", () => {
  const s = fresh();
  g.add(s, "sword");
  g.add(s, "logs", 28 - s.inventory.length);
  g.useItem(s, item(s, "sword"));
  assert.equal(s.equipment.weapon, "sword");
  assert.equal(g.count(s, "dagger"), 1);
  assert.equal(g.count(s, "sword"), 0);
  assert.equal(s.inventory.length, 28);
});
test("food heals three HP, respects cap and has a three-tick cooldown", () => {
  const s = fresh();
  g.add(s, "shrimp", 3);
  s.p.hp = 5;
  g.useItem(s, item(s, "shrimp"));
  assert.equal(s.p.hp, 8);
  g.useItem(s, item(s, "shrimp"));
  assert.equal(g.count(s, "shrimp"), 2);
  s.tick = 3;
  g.useItem(s, item(s, "shrimp"));
  assert.equal(s.p.hp, 10);
  assert.equal(g.count(s, "shrimp"), 1);
  s.tick = 6;
  g.useItem(s, item(s, "shrimp"));
  assert.equal(g.count(s, "shrimp"), 1);
});
test("bones grant 4.5 Prayer XP and firemaking consumes logs", () => {
  const s = fresh();
  g.add(s, "bones");
  g.useItem(s, item(s, "bones"));
  assert.equal(s.skills.Prayer, 4.5);
  g.add(s, "logs");
  g.useItem(s, item(s, "logs"));
  assert.equal(s.skills.Firemaking, 40);
  assert.equal(s.fire.until, 100);
  assert.equal(g.count(s, "logs"), 0);
});
test("combat grants damage XP, drops loot, counts goblins, and respawns enemies", () => {
  const s = fresh(913);
  s.skills.Attack = g.XP[98];
  s.skills.Strength = g.XP[98];
  s.nodes.goblin1.hp = 1;
  const before = s.skills.Attack;
  act(s, "goblin1");
  for (let i = 0; i < 200 && s.kills === 0; i++) g.tick(s);
  assert.equal(s.kills, 1);
  assert.ok(s.skills.Attack > before);
  assert.ok(s.skills.Hitpoints > 1154);
  assert.equal(s.nodes.goblin1.hp, 12);
  assert.ok(s.nodes.goblin1.respawn > s.tick);
  assert.equal(s.action, null);
  assert.deepEqual(s.loot.items, [
    { id: "bones", qty: 1 },
    { id: "coins", qty: 10 },
  ]);
  g.takeLoot(s);
  assert.equal(g.count(s, "bones"), 1);
  assert.equal(g.count(s, "coins"), 35);
  assert.equal(s.loot, null);
});
test("distant loot stays on ground and full backpack preserves uncollected loot", () => {
  const s = fresh();
  s.loot = { x: 32, y: 20, items: [{ id: "bones", qty: 1 }] };
  g.takeLoot(s);
  assert.equal(g.count(s, "bones"), 0);
  s.loot.x = 16;
  s.loot.y = 17;
  g.add(s, "logs", 28 - s.inventory.length);
  g.takeLoot(s);
  assert.equal(s.loot.items.length, 1);
  g.remove(s, "logs");
  g.takeLoot(s);
  assert.equal(s.loot, null);
});
test("death restores player at village, loses 10% coins and retains equipment", () => {
  const seed = seedFor((s) => {
    g.random(s);
    return g.random(s) < 0.625 && g.random(s) >= 0.5;
  });
  let found = false;
  for (let k = seed; k < seed + 500; k++) {
    const s = fresh(k);
    s.p.hp = 1;
    act(s, "goblin1");
    if (s.logs.some((l) => l.includes("wake in the village"))) {
      assert.deepEqual([s.p.x, s.p.y, s.p.hp], [16, 17, 10]);
      assert.equal(g.count(s, "coins"), 23);
      assert.equal(s.equipment.weapon, "dagger");
      assert.equal(s.action, null);
      found = true;
      break;
    }
  }
  assert.ok(found);
});
test("quest needs dialogue, starts once, requires items and cannot duplicate rewards", () => {
  const s = fresh();
  assert.equal(g.quest(s, "hearth"), false);
  s.dialog = "npc";
  assert.ok(g.quest(s, "hearth"));
  assert.equal(g.quest(s, "hearth"), false);
  g.add(s, "shrimp", 3);
  assert.ok(g.quest(s, "hearth"));
  assert.equal(g.count(s, "shrimp"), 0);
  assert.equal(g.count(s, "coins"), 100);
  assert.equal(s.skills.Cooking, 150);
  assert.equal(g.quest(s, "hearth"), false);
});
test("forge quest requires crafting and watch quest requires three goblins", () => {
  const s = fresh();
  s.dialog = "npc";
  g.quest(s, "forge");
  g.add(s, "dagger");
  assert.equal(g.quest(s, "forge"), false);
  s.crafted = 1;
  assert.ok(g.quest(s, "forge"));
  assert.equal(s.skills.Smithing, 200);
  g.quest(s, "watch");
  s.kills = 2;
  assert.equal(g.quest(s, "watch"), false);
  s.kills = 3;
  assert.ok(g.quest(s, "watch"));
  assert.equal(g.count(s, "token"), 1);
  assert.equal(s.skills.Attack, 150);
});
test("quest reward falls back to bank without losing reward when backpack is full", () => {
  const s = fresh();
  g.remove(s, "coins", 25);
  g.add(s, "logs", 28 - s.inventory.length);
  s.dialog = "npc";
  g.quest(s, "watch");
  s.kills = 3;
  assert.ok(g.quest(s, "watch"));
  assert.equal(g.count(s, "coins", "bank"), 150);
  assert.equal(g.count(s, "token", "bank"), 1);
});
test("save round trip preserves durable progress and clears transient actions", () => {
  const s = fresh(99);
  s.skills.Mining = 100;
  s.kills = 2;
  s.crafted = 3;
  s.quests.hearth = "done";
  s.dialog = "bank";
  g.transfer(s, "axe");
  g.walk(s, 20, 17);
  s.paused = true;
  const loaded = g.restore(g.save(s));
  assert.ok(loaded);
  assert.equal(loaded.skills.Mining, 100);
  assert.equal(loaded.kills, 2);
  assert.equal(loaded.crafted, 3);
  assert.equal(g.count(loaded, "axe", "bank"), 1);
  assert.equal(loaded.quests.hearth, "done");
  assert.equal(loaded.path.length, 0);
  assert.equal(loaded.action, null);
  assert.equal(loaded.dialog, null);
  assert.equal(loaded.paused, false);
  assert.ok(loaded.savedAt);
});
test("restore rejects invalid JSON and malformed structural data", () => {
  for (const raw of ["null", "{}", "[]", "not json"])
    assert.equal(g.restore(raw), null);
  for (const mutate of [
    (s) => (s.version = 2),
    (s) => s.inventory.push({ id: "fake", qty: 1 }),
    (s) => (s.inventory[0].qty = -1),
    (s) => (s.inventory[0].qty = 1.5),
    (s) => (s.inventory = Array(29).fill({ id: "logs", qty: 1 })),
    (s) => (s.skills.Attack = -1),
    (s) => (s.skills.Attack = null),
    (s) => (s.p.x = 26),
    (s) => (s.p.x = 1.5),
    (s) => (s.style = "Magic"),
    (s) => (s.equipment.weapon = "logs"),
    (s) => (s.tick = -1),
  ]) {
    const s = fresh();
    mutate(s);
    assert.equal(g.restore(JSON.stringify(s)), null);
  }
});
test("restore clamps HP/energy and sanitizes logs and node timers", () => {
  const s = fresh();
  s.p.hp = 999;
  s.p.energy = -100;
  s.logs = ["safe", 12, {}];
  s.nodes.rat1.respawn = 9999;
  const r = g.restore(JSON.stringify(s));
  assert.equal(r.p.hp, 10);
  assert.equal(r.p.energy, 0);
  assert.deepEqual(r.logs, ["safe"]);
  assert.equal(r.nodes.rat1.respawn, 0);
});
test("combat XP is capped to remaining enemy HP rather than rolled overkill", () => {
  const seed = seedFor((s) => g.random(s) < 0.9 && g.random(s) > 0.3);
  const s = fresh(seed);
  s.skills.Attack = g.XP[98];
  s.skills.Strength = g.XP[98];
  s.nodes.rat1.hp = 1;
  const before = s.skills.Attack;
  act(s, "rat1");
  assert.equal(s.skills.Attack - before, 4);
  assert.equal(s.skills.Hitpoints, 1155.33);
});
test("malformed quantities cannot duplicate inventory through add/remove", () => {
  const s = fresh();
  for (const qty of [-1, 1.5, NaN, Infinity]) {
    assert.equal(g.add(s, "logs", qty), false);
    assert.equal(g.remove(s, "coins", qty), false);
  }
  assert.equal(g.count(s, "coins"), 25);
});
test("restore rejects stacked tools and invalid counters, tick or seed", () => {
  for (const mutate of [
    (s) => (s.inventory[0].qty = 2),
    (s) => (s.kills = "3"),
    (s) => (s.crafted = -1),
    (s) => (s.tick = 0.5),
    (s) => (s.seed = -1),
    (s) => (s.seed = 4294967296),
  ]) {
    const s = fresh();
    mutate(s);
    assert.equal(g.restore(JSON.stringify(s)), null);
  }
});
test("restore does not trust unknown properties or malformed fire and timers", () => {
  const s = fresh();
  s.fire = { x: 26, y: 2, until: 10 };
  s.eatAfter = "forever";
  s.exploit = true;
  s.p.run = "yes";
  s.p.prayer = 100;
  s.quests = { hearth: "done", fake: "done" };
  const r = g.restore(JSON.stringify(s));
  assert.ok(r);
  assert.equal(r.fire, undefined);
  assert.equal(r.eatAfter, undefined);
  assert.equal(r.exploit, undefined);
  assert.equal(r.p.run, false);
  assert.equal(r.p.prayer, 1);
  assert.deepEqual(r.quests, { hearth: "done" });
});

test("smithing requires a carried hammer and preserves bar when it is missing", () => {
  const s = fresh();
  assert.equal(g.count(s, "hammer"), 1);
  g.remove(s, "hammer");
  g.add(s, "bar");
  act(s, "anvil");
  assert.equal(s.action, null);
  assert.equal(g.count(s, "bar"), 1);
  assert.equal(g.count(s, "dagger"), 0);
  assert.equal(s.skills.Smithing, 0);
  assert.equal(s.crafted, 0);
  assert.match(s.logs.at(-1), /hammer/);
  g.add(s, "hammer");
  act(s, "anvil");
  assert.equal(g.count(s, "bar"), 0);
  assert.equal(g.count(s, "dagger"), 1);
  assert.equal(s.skills.Smithing, 12.5);
  assert.equal(s.crafted, 1);
});

test("shrimp cooking table has exact endpoints and guaranteed level 34 success", () => {
  assert.equal(g.SHRIMP_COOK_CHANCE.length, 34);
  assert.equal(g.SHRIMP_COOK_CHANCE[0], 129);
  assert.equal(g.SHRIMP_COOK_CHANCE[32], 254);
  assert.equal(g.SHRIMP_COOK_CHANCE[33], 256);
  for (let i = 1; i < 34; i++)
    assert.ok(g.SHRIMP_COOK_CHANCE[i] >= g.SHRIMP_COOK_CHANCE[i - 1]);
  const seed = seedFor((s) => g.random(s) > 0.995);
  const low = fresh(seed);
  low.skills.Cooking = g.XP[32];
  g.add(low, "raw");
  g.cook(low);
  assert.equal(g.count(low, "burnt"), 1);
  const high = fresh(seed);
  high.skills.Cooking = g.XP[33];
  g.add(high, "raw");
  g.cook(high);
  assert.equal(g.count(high, "shrimp"), 1);
  assert.equal(high.skills.Cooking, g.XP[33] + 30);
});
test("level one shrimp cooking uses 129/256 threshold rather than old flat chance", () => {
  const seed = seedFor((s) => {
    const roll = g.random(s);
    return roll > 129 / 256 && roll < 0.65;
  });
  const s = fresh(seed);
  g.add(s, "raw");
  g.cook(s);
  assert.equal(g.count(s, "burnt"), 1);
  assert.equal(s.skills.Cooking, 0);
});
test("normal trees always deplete after a successful log", () => {
  const seed = seedFor((s) => g.random(s) < 0.65 && g.random(s) > 0.35);
  const s = fresh(seed);
  act(s, "tree1");
  assert.equal(g.count(s, "logs"), 1);
  assert.equal(s.nodes.tree1.respawn, s.tick + 20);
  assert.equal(s.action, null);
});
test("oak timer begins on first success, lasts 45 ticks, and regrows after 20", () => {
  const s = fresh();
  s.skills.Woodcutting = g.XP[14];
  act(s, "oak");
  assert.equal(g.count(s, "oak"), 1);
  assert.equal(s.nodes.oak.activeUntil, 46);
  assert.equal(s.nodes.oak.respawn, 0);
  assert.ok(s.action);
  s.tick = 44;
  s.seed = 1;
  act(s, "oak");
  assert.equal(g.count(s, "oak"), 2);
  assert.equal(s.nodes.oak.activeUntil, 46);
  act(s, "oak");
  assert.equal(s.tick, 46);
  assert.equal(g.count(s, "oak"), 2);
  assert.equal(s.nodes.oak.activeUntil, null);
  assert.equal(s.nodes.oak.respawn, 66);
  assert.equal(s.action, null);
  assert.equal(g.interact(s, "oak"), false);
  s.tick = 66;
  assert.ok(g.interact(s, "oak"));
  s.seed = 1;
  act(s, "oak");
  assert.equal(g.count(s, "oak"), 3);
  assert.equal(s.nodes.oak.activeUntil, 112);
});
test("prototype property names cannot become item IDs through add, trade, or restore", () => {
  for (const id of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
    const s = fresh();
    assert.equal(g.add(s, id), false);
    assert.equal(g.add(s, id, 1, "bank"), false);
    assert.equal(g.remove(s, id, 0), false);
    s.dialog = "shop";
    assert.equal(g.trade(s, id), false);
    assert.equal(g.trade(s, id, false), false);
    assert.equal(g.count(s, "coins"), 25);
    for (const bag of ["inventory", "bank"]) {
      const save = fresh();
      save[bag].push({ id, qty: 1 });
      assert.equal(g.restore(JSON.stringify(save)), null);
    }
  }
});
