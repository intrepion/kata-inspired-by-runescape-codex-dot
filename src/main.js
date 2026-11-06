import "./style.css";
import {
  createGame,
  restore,
  save,
  tick,
  TICK_MS,
  SAVE_KEY,
  NODES,
  ITEMS,
  SKILLS,
  QUESTS,
  XP,
  level,
  count,
  interact,
  walk,
  stop,
  useItem,
  transfer,
  depositAll,
  trade,
  quest,
  takeLoot,
  log,
} from "./game.js";
import { createScene } from "./scene.js";
const $ = (s) => document.querySelector(s);
let state,
  saveWarning = false;
try {
  state = restore(localStorage.getItem(SAVE_KEY));
} catch {
  saveWarning = true;
}
const hasSave = !!state;
state ||= createGame();
let tab = "pack",
  modal = null,
  started = false,
  lastDialog = null,
  lastLog = "",
  lastInventory = "",
  lastPanel = "",
  sound = false;
const escape = (t) =>
  String(t).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
$("#app").innerHTML =
  `<header><div class="brand"><div class="crest">ᛟ</div><div><h1>Embervale</h1><p class="eyebrow">A small world. A long adventure.</p></div></div><div class="header-right"><span class="world-status"><i class="status-dot"></i> SOLO WORLD · 600 MS TICKS</span><a class="help-link" href="#" id="help-top">Field guide</a><a class="arcade" href="https://intrepion.github.io/">← Kata Arcade</a></div></header><main class="shell"><div class="subheader"><h2>The valley is yours.</h2><small>POINT. CLICK. FIND YOUR OWN PATH.</small></div><div class="layout"><section><div class="world-wrap"><div id="world"></div><div class="world-top"><div class="place"><strong id="region">Willowbank village</strong><small>EMBERWATER VALLEY · SINGLE PLAYER</small></div><div class="compass" title="Rotatable isometric camera">N ↑</div></div><div id="floats"></div><div id="hover"></div><div class="world-bottom"><div class="hint">Click the ground to walk. Click a tree, rock, creature or villager to interact.</div><div class="camera"><div class="camera-row"><button id="rotate-left" aria-label="Rotate camera left">↶</button><button id="rotate-right" aria-label="Rotate camera right">↷</button></div><div class="camera-row"><button id="zoom-in" aria-label="Zoom in">＋</button><button id="zoom-out" aria-label="Zoom out">−</button></div></div></div></div><div class="toolbar"><div id="activity" class="activity">An adventure begins with a single step.</div><button id="run">Walk · 100%</button><button id="loot" hidden>Take loot</button><button id="campfire" hidden>Cook at fire</button><button id="stop">Stop</button><button id="pause">Pause</button></div><div class="log" role="log" aria-label="Adventure log"><div class="log-title">ADVENTURE LOG</div><div id="log-lines"></div></div></section><aside><section class="panel"><div class="panel-head"><h3>Adventurer</h3><small id="combat-level">Combat level 3</small></div><div class="vitals"><div class="meters"><div><div class="stat-line"><span>♥ Health</span><span id="hp-text"></span></div><div class="bar"><i id="hp-bar"></i></div></div><div><div class="stat-line"><span>ϟ Energy</span><span id="energy-text"></span></div><div class="bar energy"><i id="energy-bar"></i></div></div></div><div class="equip"><span>⚔ <strong id="weapon"></strong></span><span>⬡ <strong id="shield"></strong></span></div><div class="style-buttons"><button data-style="Attack">Accurate</button><button data-style="Strength">Aggressive</button><button data-style="Defence">Defensive</button></div></div></section><section class="panel"><nav class="tabs" aria-label="Adventurer panels"><button data-tab="pack" class="active">Backpack</button><button data-tab="skills">Skills</button><button data-tab="quests">Quests</button></nav><div id="tab-body" class="tab-body"></div></section><section class="panel"><div class="panel-head"><h3>Around the valley</h3><small>CLICK TO TRAVEL</small></div><div id="nearby" class="nearby"></div><div id="selected" class="selected-info"><strong>Make yourself at home</strong><p>Meet Elowen in the square, or try fishing beside the river.</p></div></section></aside></div><footer class="footer"><span>Inspired by Old School RuneScape. Original world & assets. <a href="#" id="about">Fidelity & credits</a></span><span id="save-status">Saves locally in this browser</span><div><button id="sound">Sound off</button> <button id="help">Help</button></div></footer></main><div id="overlay" hidden></div>`;
let scene;
try {
  scene = createScene(
    $("#world"),
    (p) => {
      if (!started || modal || state.paused) return;
      if (p.id) {
        state.selected = p.id;
        interact(state, p.id);
      } else walk(state, p.x, p.y);
      refresh();
    },
    (id) => {
      $("#hover").textContent = id
        ? `${NODES.find((n) => n.id === id).action} · ${NODES.find((n) => n.id === id).name}`
        : "";
    },
  );
} catch (e) {
  $("#world").innerHTML =
    '<div id="error">This game needs a browser with WebGL enabled. Please enable hardware acceleration or try a current browser.</div>';
  console.error(e);
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, save(state));
    $("#save-status").textContent = "Saved locally · just now";
  } catch {
    saveWarning = true;
    $("#save-status").textContent =
      "Storage unavailable · progress cannot save";
  }
}
function beep() {
  if (!sound) return;
  try {
    const ac = window._audio || (window._audio = new AudioContext());
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.type = "sine";
    o.frequency.value = 620;
    g.gain.setValueAtTime(0.035, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.13);
    o.start();
    o.stop(ac.currentTime + 0.14);
  } catch {}
}
function show(title, html, type = "info") {
  modal = type;
  $("#overlay").hidden = false;
  $("#overlay").innerHTML =
    `<section class="dialog" role="dialog" aria-modal="true" aria-label="${escape(title)}"><button class="close" id="close-dialog" aria-label="Close dialog">×</button>${html}</section>`;
  $("#close-dialog").onclick = close;
  $("#close-dialog").focus();
  bindDialog();
}
function close() {
  if (modal === "welcome") {
    start();
    return;
  }
  modal = null;
  state.dialog = null;
  lastDialog = null;
  state.paused = false;
  $("#overlay").hidden = true;
  refresh();
}
function start() {
  started = true;
  modal = null;
  state.paused = false;
  $("#overlay").hidden = true;
  $("#help").focus();
  refresh();
  if (saveWarning)
    log(
      state,
      "Browser storage is unavailable. This session will not be saved.",
    );
}
function welcome() {
  show(
    "Welcome to Embervale",
    `<div class="welcome-mark">✦</div><p class="eyebrow">A KATA ARCADE ADVENTURE</p><h2>Your story starts small.</h2><p>A pickaxe. A fishing net. A path through the trees. Make your living in Embervale, one skill at a time.</p><div class="welcome-grid"><div><strong>Gather & create</strong><p>Mine copper and tin, forge bronze, catch supper and light your own fire.</p></div><div><strong>Explore & grow</strong><p>Train skills, bank your haul, help the valley and face creatures across the river.</p></div></div><p class="muted">An original single-player reconstruction of selected Old School RuneScape systems, not the full MMORPG. Click-to-walk, 600 ms ticks, 28 inventory slots and permanent skill XP.</p><div class="dialog-actions"><button class="gold" id="start">${hasSave ? "Continue adventure" : "Enter the valley"} →</button><button id="welcome-help">How to play</button></div>`,
    "welcome",
  );
  $("#start").onclick = start;
  $("#welcome-help").onclick = help;
}
function help() {
  show(
    "Field guide",
    `<p class="eyebrow">FIELD GUIDE</p><h2>Follow your curiosity.</h2><ul><li><b>Move:</b> click/tap the ground. Click an object to walk into range and interact. The Around the valley buttons do the same, without teleporting.</li><li><b>Gather:</b> carry the right tool. Actions repeat until the resource depletes or your 28-slot backpack is full. Ore rocks replenish; keep clicking to mine again.</li><li><b>Create:</b> copper + tin → furnace → bronze bar → anvil → dagger. Fish at the river, then use the village range. Cooked shrimps heal 3 HP.</li><li><b>Backpack:</b> click food to eat, a weapon/shield to equip, bones to bury, or logs to light a fire with your tinderbox. Shift-click an item to drop it.</li><li><b>Fight:</b> click a rat or goblin to auto-attack. Accurate trains Attack, Aggressive trains Strength, Defensive trains Defence. Walk away to disengage. Pick up the loot after each kill.</li><li><b>Grow:</b> talk to Elowen for three quests. Bank resources, sell goods and buy equipment at the store. Oak requires Woodcutting 15.</li><li><b>Camera:</b> Q/E rotates; +/− or mouse wheel zooms. Escape closes dialogs or pauses. R toggles running; Space stops your action.</li></ul><p class="muted">Progress saves locally. Changing tabs pauses the world; there is no offline progress. Death returns you to the village and costs 10% of carried coins, an intentionally forgiving local rule.</p><button id="return-game" class="gold">${started ? "Back to the valley" : "Enter the valley"} →</button>`,
  );
  $("#return-game").onclick = () => (started ? close() : start());
}
function about() {
  show(
    "Fidelity and credits",
    `<p class="eyebrow">INDEPENDENT GAMEPLAY STUDY</p><h2>Familiar rhythms. A new valley.</h2><p>Embervale reconstructs a selected Old School RuneScape-style starter loop: tile navigation, 600 ms ticks, 28-slot inventory, classic XP curve, tool-gated gathering, bronze processing, food, banking, shops and melee auto-combat.</p><p>It is not exact whole-game parity. Gathering probabilities, enemy balancing, layout, quests, shops and death rules are simplified/original. No multiplayer economy, Grand Exchange, PvP, ranged/magic combat, complete prayer system or full content catalogue is included.</p><p>All models are original procedural Three.js geometry. RuneScape is a trademark of Jagex. This project is not affiliated with or endorsed by Jagex.</p><p><a href="https://github.com/intrepion/kata-inspired-by-runescape-codex-dot/blob/main/docs/RESEARCH.md" target="_blank" rel="noreferrer">Research, sources and fidelity matrix ↗</a></p><p class="muted">Original code & assets: MIT. Three.js: MIT. No account, analytics, payments or runtime asset downloads.</p><button id="reset">Reset adventure…</button>`,
  );
  $("#reset").onclick = () => {
    show(
      "Reset adventure",
      `<h2>Start a new story?</h2><p>This removes your locally saved skills, items and quests. There is no undo.</p><div class="dialog-actions"><button id="confirm-reset">Reset local adventure</button><button id="cancel-reset">Keep playing</button></div>`,
    );
    $("#confirm-reset").onclick = () => {
      state = createGame();
      persist();
      started = true;
      close();
    };
    $("#cancel-reset").onclick = close;
  };
}
function bindDialog() {
  if (["npc", "bank", "shop"].includes(modal)) {
    const feedback = document.createElement("p");
    feedback.className = "muted";
    feedback.setAttribute("role", "status");
    feedback.textContent = state.logs.at(-1) || "";
    $(".dialog").append(feedback);
  }
  document.querySelectorAll("[data-quest]").forEach(
    (b) =>
      (b.onclick = () => {
        quest(state, b.dataset.quest);
        renderDialog("npc");
        refresh();
        persist();
      }),
  );
  document.querySelectorAll("[data-deposit]").forEach(
    (b) =>
      (b.onclick = () => {
        transfer(state, b.dataset.deposit, true);
        renderDialog("bank");
        refresh();
        persist();
      }),
  );
  document.querySelectorAll("[data-withdraw]").forEach(
    (b) =>
      (b.onclick = () => {
        transfer(state, b.dataset.withdraw, false);
        renderDialog("bank");
        refresh();
        persist();
      }),
  );
  if ($("#deposit-all"))
    $("#deposit-all").onclick = () => {
      depositAll(state);
      renderDialog("bank");
      refresh();
      persist();
    };
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        trade(state, b.dataset.buy, true);
        renderDialog("shop");
        refresh();
        persist();
      }),
  );
  document.querySelectorAll("[data-sell]").forEach(
    (b) =>
      (b.onclick = () => {
        trade(state, b.dataset.sell, false);
        renderDialog("shop");
        refresh();
        persist();
      }),
  );
}
function renderDialog(kind) {
  state.dialog = kind;
  lastDialog = kind;
  if (kind === "npc") {
    show(
      "Warden Elowen",
      `<p class="eyebrow">WARDEN OF WILLOWBANK</p><h2>Welcome, wanderer.</h2><p>“Good hands are always welcome here. Help at the hearth, learn the old forge, then see what lies beyond our bridge.”</p>${QUESTS.map((q) => `<div class="quest-item"><h4>${q.name}</h4><p>${q.brief}</p><p>${q.reward}</p><button data-quest="${q.id}" ${state.quests[q.id] === "done" ? "disabled" : ""}>${state.quests[q.id] === "done" ? "Completed ✓" : state.quests[q.id] === "active" ? "Complete quest" : "Accept quest"}</button></div>`).join("")}`,
      "npc",
    );
  }
  if (kind === "bank") {
    const rows = (bag, attr) =>
      [...new Set(state[bag].map((v) => v.id))]
        .map(
          (id) =>
            `<div class="trade-row"><span>${ITEMS[id].icon} ${ITEMS[id].name} × ${count(state, id, bag)}</span><button ${attr}="${id}">${bag === "bank" ? "Withdraw" : "Deposit"} 1</button></div>`,
        )
        .join("");
    show(
      "Valley bank",
      `<p class="eyebrow">SAFE KEEPING</p><h2>Your bank</h2><p>Items in the bank stack, but gathering tools must be in your backpack. Withdrawals respect its 28 slots.</p><h3>Backpack · ${state.inventory.length}/28</h3><div class="trade-list">${rows("inventory", "data-deposit") || "<p>Backpack empty.</p>"}</div><div class="dialog-actions"><button id="deposit-all">Deposit entire backpack</button></div><h3>Bank storage</h3><div class="trade-list">${rows("bank", "data-withdraw") || "<p>Your bank is empty.</p>"}</div>`,
      "bank",
    );
  }
  if (kind === "shop") {
    show(
      "Merrin’s general store",
      `<p class="eyebrow">MERRIN’S GENERAL STORE</p><h2>Something for the road?</h2><p>You carry <b>${count(state, "coins")} coins</b>. Shops use fixed local prices in this valley.</p><h3>Buy supplies</h3><div class="trade-list">${["axe", "pickaxe", "net", "tinderbox", "hammer", "sword", "shield", "shrimp"].map((id) => `<div class="trade-row"><span>${ITEMS[id].icon} ${ITEMS[id].name}</span><button data-buy="${id}">Buy · ${ITEMS[id].value * 2}</button></div>`).join("")}</div><h3>Sell from backpack</h3><div class="trade-list">${[
        ...new Set(state.inventory.map((v) => v.id)),
      ]
        .filter((id) => id !== "coins" && id !== "token")
        .map(
          (id) =>
            `<div class="trade-row"><span>${ITEMS[id].name} × ${count(state, id)}</span><button data-sell="${id}">Sell · ${Math.floor(ITEMS[id].value / 2)}</button></div>`,
        )
        .join("")}</div>`,
      "shop",
    );
  }
}
function refresh() {
  const hp = level(state.skills.Hitpoints);
  $("#hp-text").textContent = `${state.p.hp} / ${hp}`;
  $("#hp-bar").style.width = (state.p.hp / hp) * 100 + "%";
  $("#energy-text").textContent = Math.floor(state.p.energy) + "%";
  $("#energy-bar").style.width = state.p.energy + "%";
  $("#weapon").textContent = ITEMS[state.equipment.weapon].name;
  $("#shield").textContent = state.equipment.shield
    ? ITEMS[state.equipment.shield].name
    : "No shield";
  $("#combat-level").textContent =
    "Combat level " +
    Math.floor(
      0.25 *
        (level(state.skills.Defence) +
          hp +
          Math.floor(level(state.skills.Prayer) / 2)) +
        0.325 * (level(state.skills.Attack) + level(state.skills.Strength)),
    );
  $("#run").textContent =
    `${state.p.run ? "Run" : "Walk"} · ${Math.floor(state.p.energy)}%`;
  $("#region").textContent =
    state.p.x > 27
      ? "The lowlands"
      : state.p.y > 20
        ? "Copperfell quarry"
        : state.p.x < 10
          ? "The western woods"
          : "Willowbank village";
  $("#activity").textContent = state.paused
    ? "Paused"
    : state.path.length
      ? `Walking · ${state.path.length} tiles to go`
      : state.action
        ? `${NODES.find((n) => n.id === state.action.id)?.action || "Cooking"} · ${NODES.find((n) => n.id === state.action.id)?.name || "campfire"}`
        : "Choose your next adventure.";
  $("#activity").dataset.x = state.p.x;
  $("#activity").dataset.y = state.p.y;
  $("#activity").dataset.tick = state.tick;
  $("#activity").dataset.action = state.action?.id || "";
  $("#loot").hidden = !state.loot;
  $("#campfire").hidden = !(state.fire && state.fire.until > state.tick);
  document
    .querySelectorAll("[data-style]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.style === state.style),
    );
  const key = JSON.stringify([
    tab,
    state.inventory,
    state.skills,
    state.quests,
    state.kills,
    state.crafted,
  ]);
  if (key !== lastInventory) {
    lastInventory = key;
    if (tab === "pack")
      $("#tab-body").innerHTML =
        `<div class="inventory" aria-label="28-slot backpack">${Array.from(
          { length: 28 },
          (_, i) => {
            const v = state.inventory[i];
            return v
              ? `<button class="slot" data-item="${i}" title="${ITEMS[v.id].name}${ITEMS[v.id].heal ? " · Eat" : ITEMS[v.id].weapon || ITEMS[v.id].defence ? " · Equip" : v.id === "bones" ? " · Bury" : v.id === "logs" ? " · Light fire" : ""}" aria-label="${ITEMS[v.id].name} ${v.qty}" data-item-id="${v.id}">${ITEMS[v.id].icon}${v.qty > 1 ? `<small>${v.qty}</small>` : ""}</button>`
              : '<div class="slot empty"></div>';
          },
        ).join(
          "",
        )}</div><p class="inventory-caption">${state.inventory.length} / 28 slots · Click to use. Shift-click to drop.<br>Coins stack. Tools must be carried to gather.</p>`;
    if (tab === "skills")
      $("#tab-body").innerHTML = `<div class="skills">${SKILLS.map((k) => {
        const l = level(state.skills[k]),
          progress =
            l === 99
              ? 100
              : ((state.skills[k] - XP[l - 1]) / (XP[l] - XP[l - 1])) * 100;
        return `<div class="skill" title="${state.skills[k].toFixed(1)} XP · next level ${XP[l] || "maximum"}"><span>${k}</span><strong>${l}</strong><div class="bar"><i style="width:${progress}%"></i></div></div>`;
      }).join(
        "",
      )}</div><p class="inventory-caption">Total level ${SKILLS.reduce((v, k) => v + level(state.skills[k]), 0)} · Original 1–99 experience curve</p>`;
    if (tab === "quests")
      $("#tab-body").innerHTML =
        QUESTS.map(
          (q) =>
            `<div class="quest-item"><span class="badge ${state.quests[q.id] === "done" ? "done" : ""}">${state.quests[q.id] === "done" ? "COMPLETE" : state.quests[q.id] === "active" ? "IN PROGRESS" : "NOT STARTED"}</span><h4>${q.name}</h4><p>${q.brief}${q.kills ? ` (${state.kills}/3)` : ""}</p></div>`,
        ).join("") +
        '<p class="inventory-caption">Talk to Warden Elowen to start and turn in quests.</p>';
    document.querySelectorAll("[data-item]").forEach(
      (b) =>
        (b.onclick = (e) => {
          if (!started || modal || state.paused) return;
          const i = +b.dataset.item;
          if (e.shiftKey) {
            const item = state.inventory.splice(i, 1)[0];
            log(state, `You drop ${ITEMS[item.id].name.toLowerCase()}.`);
          } else useItem(state, i);
          refresh();
          persist();
        }),
    );
  }
  const selected = NODES.find((n) => n.id === state.selected);
  const panelkey =
    state.selected +
    ":" +
    (selected ? state.nodes[selected.id].respawn > state.tick : false);
  if (panelkey !== lastPanel) {
    lastPanel = panelkey;
    if (selected) {
      const depleted = state.nodes[selected.id].respawn > state.tick;
      $("#selected").innerHTML =
        `<strong>${selected.name}</strong>${selected.hp ? '<div id="target-health"></div>' : ""}<p>${selected.desc}</p><button id="interact-selected" ${depleted ? "disabled" : ""}>${depleted ? "Replenishing…" : selected.action + " " + selected.name + " →"}</button>`;
      $("#interact-selected").onclick = () => {
        interact(state, selected.id);
        refresh();
      };
    }
  }
  if ($("#target-health") && selected?.hp) {
    $("#target-health").textContent =
      state.nodes[selected.id].respawn > state.tick
        ? "Defeated · respawning"
        : `Health: ${state.nodes[selected.id].hp} / ${selected.hp}`;
  }
  if (lastLog !== state.logs.join("|")) {
    lastLog = state.logs.join("|");
    $("#log-lines").innerHTML = state.logs
      .slice(-5)
      .map((m) => `<p>${escape(m)}</p>`)
      .join("");
    $(".log").scrollTop = $(".log").scrollHeight;
  }
  if (state.dialog && state.dialog !== lastDialog) renderDialog(state.dialog);
}
$("#nearby").innerHTML = NODES.filter(
  (n) =>
    !["tree2", "tree3", "copper2", "fish2", "rat2", "goblin2"].includes(n.id),
)
  .map(
    (n) =>
      `<button data-node="${n.id}">${n.name}<span>${n.action}</span></button>`,
  )
  .join("");
document.querySelectorAll("[data-node]").forEach(
  (b) =>
    (b.onclick = () => {
      if (!started || modal || state.paused) return;
      interact(state, b.dataset.node);
      refresh();
    }),
);
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      document
        .querySelectorAll("[data-tab]")
        .forEach((x) => x.classList.toggle("active", x === b));
      refresh();
    }),
);
document.querySelectorAll("[data-style]").forEach(
  (b) =>
    (b.onclick = () => {
      state.style = b.dataset.style;
      refresh();
      persist();
    }),
);
$("#run").onclick = () => {
  state.p.run = !state.p.run;
  refresh();
};
$("#stop").onclick = () => {
  stop(state);
  refresh();
};
$("#loot").onclick = () => {
  takeLoot(state);
  refresh();
  persist();
};
$("#campfire").onclick = () => {
  if (state.fire) {
    if (
      Math.max(
        Math.abs(state.p.x - state.fire.x),
        Math.abs(state.p.y - state.fire.y),
      ) > 1
    ) {
      walk(state, state.fire.x, state.fire.y);
    }
    state.action = { id: "fire", wait: 0 };
  }
  refresh();
};
$("#rotate-left").onclick = () => scene?.rotate(-1);
$("#rotate-right").onclick = () => scene?.rotate(1);
$("#zoom-in").onclick = () => scene?.zoom(-1);
$("#zoom-out").onclick = () => scene?.zoom(1);
$("#help").onclick = help;
$("#help-top").onclick = (e) => {
  e.preventDefault();
  help();
};
$("#about").onclick = (e) => {
  e.preventDefault();
  about();
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").textContent = sound ? "Sound on" : "Sound off";
  beep();
};
function pause() {
  if (!started) return;
  state.paused = true;
  show(
    "Adventure paused",
    `<p class="eyebrow">TAKE A BREATH</p><h2>The valley can wait.</h2><p>Your adventure is saved. Nothing progresses while paused.</p><div class="dialog-actions"><button class="gold" id="resume">Resume adventure</button><button id="pause-help">Field guide</button></div>`,
    "pause",
  );
  $("#resume").onclick = close;
  $("#pause-help").onclick = help;
  persist();
  refresh();
}
$("#pause").onclick = pause;
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && modal) {
    const focusable = [
      ...$("#overlay").querySelectorAll("button:not(:disabled),a"),
    ];
    if (e.shiftKey && document.activeElement === focusable[0]) {
      e.preventDefault();
      focusable.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === focusable.at(-1)) {
      e.preventDefault();
      focusable[0].focus();
    }
    return;
  }
  if (e.key === "Escape") {
    if (modal) close();
    else pause();
    return;
  }
  if (modal || !started) return;
  if (e.key === "q") scene?.rotate(-1);
  if (e.key === "e") scene?.rotate(1);
  if (e.key === "+" || e.key === "=") scene?.zoom(-1);
  if (e.key === "-") scene?.zoom(1);
  if (e.key.toLowerCase() === "r") {
    state.p.run = !state.p.run;
    refresh();
  }
  if (
    e.code === "Space" &&
    !["BUTTON", "A"].includes(document.activeElement?.tagName)
  ) {
    e.preventDefault();
    stop(state);
    refresh();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started && !modal) pause();
});
window.addEventListener("beforeunload", persist);
let prev = performance.now(),
  acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  if (started && !modal && !state.paused) {
    acc += dt * 1000;
    while (acc >= TICK_MS) {
      tick(state);
      acc -= TICK_MS;
      refresh();
      for (const e of state.events)
        if (e.kind === "xp") {
          const el = document.createElement("div");
          el.className = "xp-pop";
          el.textContent = e.text;
          $("#floats").append(el);
          setTimeout(() => el.remove(), 2800);
          beep();
        }
      if (state.tick % 10 === 0) persist();
    }
  } else acc = 0;
  scene?.frame(state, dt, now / 1000);
  requestAnimationFrame(frame);
}
refresh();
welcome();
requestAnimationFrame(frame);
