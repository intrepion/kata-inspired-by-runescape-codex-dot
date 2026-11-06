import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { launch } from "./browser-harness.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  inputs = {};
async function inventory(dir, prefix = "") {
  for (const item of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const name = prefix + item.name;
    if (name === "arcade") continue;
    if (item.isDirectory())
      await inventory(resolve(dir, item.name), name + "/");
    else inputs[name] = sha(await readFile(resolve(dir, item.name)));
  }
}
await inventory(resolve("dist"));
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  viewport = { width: 1440, height: 1000 },
  clock = "2026-11-06T00:00:00Z";
const app = await launch(viewport),
  { page, browser, baseUrl, errors } = app,
  screenshots = [];
const steps = [
  "Serve the unchanged production dist build through http://127.0.0.1 on an ephemeral port.",
  "Open a clean Chromium context at 1440 × 1000, en-US, UTC, device scale 1.",
  "Fix Date at 2026-11-06T00:00:00Z for the seeded model, without altering normal animation or gameplay timers.",
  "Click Enter the valley, then enable Run using the public control.",
];
async function action(id) {
  await page.locator(`[data-node="${id}"]`).click();
}
async function waitLog(text) {
  await page.waitForFunction(
    (t) => document.querySelector("#log-lines").textContent.includes(t),
    text,
    { timeout: 60000 },
  );
}
async function capture(index, alt) {
  if (errors.length) throw Error(errors.join("\n"));
  await page.mouse.move(0, 0);
  const name = `embervale-20261106-0${index}`,
    path = `arcade/screenshots/${name}.jpg`,
    sourcePath = `arcade/capture-evidence/${name}.png`,
    captureRecordPath = `arcade/capture-evidence/${name}.json`;
  await mkdir("public/arcade/screenshots", { recursive: true });
  await mkdir("public/arcade/capture-evidence", { recursive: true });
  await page.screenshot({
    path: resolve("public", sourcePath),
    fullPage: true,
  });
  await page.screenshot({
    path: resolve("public", path),
    type: "jpeg",
    quality: 91,
    fullPage: true,
  });
  const record = {
    sourceCommit,
    inputs,
    capturedAt,
    baseUrl,
    tool: {
      name: "Playwright",
      version: JSON.parse(
        await readFile("node_modules/playwright/package.json"),
      ).version,
    },
    browser: { name: "Chromium", version: browser.version() },
    viewport,
    steps: [...steps],
    clock,
    deployedBuild: null,
    notes:
      "Genuine public-control gameplay, locally served production artifact. Browser pixels unedited. No state/save injection, no mock screenshot, no deployed-build equivalence asserted.",
  };
  await writeFile(
    resolve("public", captureRecordPath),
    JSON.stringify(record, null, 2) + "\n",
  );
  screenshots.push({
    path,
    sha256: sha(await readFile(resolve("public", path))),
    alt,
    provenance: {
      kind: "local_gameplay_capture",
      sourcePath,
      sourceSha256: sha(await readFile(resolve("public", sourcePath))),
      captureCommit: sourceCommit,
      inputHashes: inputs,
      capturedAt,
      captureRecordPath,
      captureRecordSha256: sha(
        await readFile(resolve("public", captureRecordPath)),
      ),
    },
  });
}
try {
  await page.clock.setFixedTime(new Date(clock));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#start").click();
  await page.locator("#run").click();
  await action("guide");
  await page
    .locator('[data-quest="forge"]')
    .waitFor({ state: "visible", timeout: 30000 });
  await page.locator('[data-quest="forge"]').click();
  await page.locator('[data-quest="hearth"]').click();
  await page.keyboard.press("Escape");
  steps.push(
    "Walk to Warden Elowen and accept the forge and cooking quests through normal dialogue.",
  );
  await action("fish1");
  await page.waitForFunction(
    () => document.querySelectorAll('[data-item-id="raw"]').length >= 4,
    null,
    { timeout: 90000 },
  );
  steps.push(
    "Walk to the river fishing spot with the starting small net and naturally catch at least four raw shrimps.",
  );
  await capture(
    1,
    "Embervale fishing beside the river in its original 3D valley, with gathered shrimps in the 28-slot backpack, village workshops and bank, and the active fishing action.",
  );
  await page.locator("#stop").click();
  await action("copper1");
  await waitLog("You receive copper ore");
  await action("tin1");
  await waitLog("You receive tin ore");
  await action("furnace");
  await waitLog("You smelt a bronze bar");
  await action("anvil");
  await waitLog("You forge a bronze dagger");
  steps.push(
    "Stop fishing, walk to copper and tin rocks, naturally mine both ores, smelt the bronze bar at the furnace, and forge a dagger at the anvil with the starting hammer.",
  );
  await action("guide");
  await page
    .locator('[data-quest="forge"]')
    .waitFor({ state: "visible", timeout: 30000 });
  await page.locator('[data-quest="forge"]').click();
  await page.keyboard.press("Escape");
  await page.locator('[data-tab="skills"]').click();
  steps.push(
    "Return to Elowen and complete the forge quest, earning its reward, then open Skills to show naturally earned progression.",
  );
  await page.waitForTimeout(700);
  await capture(
    2,
    "Embervale after completing its bronze smithing quest, showing naturally earned Mining, Fishing and Smithing progression and the original isometric village.",
  );
  if (screenshots.length !== 2)
    throw Error(
      "Two representative captures required; previous manifest retained.",
    );
  await writeFile(
    "public/arcade/manifest.json",
    JSON.stringify(
      {
        schemaVersion: 3,
        gameId: "kata-inspired-by-runescape-codex-dot",
        playUrl:
          "https://intrepion.github.io/kata-inspired-by-runescape-codex-dot/",
        screenshots,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Captured ${screenshots.length} genuine gameplay screenshots from ${baseUrl}`,
  );
} finally {
  await app.close();
}
