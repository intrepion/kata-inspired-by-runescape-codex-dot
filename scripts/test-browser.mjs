import assert from "node:assert/strict";
import { launch } from "./browser-harness.mjs";
const app = await launch({ width: 1280, height: 900 }),
  { page, baseUrl, errors, context } = app;
async function waitText(pattern, timeout = 30000) {
  await page.waitForFunction(
    (p) => new RegExp(p).test(document.querySelector("#log-lines").textContent),
    pattern,
    { timeout },
  );
}
async function action(id) {
  await page.locator(`[data-node="${id}"]`).click();
}
async function dialog(id) {
  await action(id);
  await page.locator(".dialog").waitFor({ state: "visible", timeout: 30000 });
}
try {
  await page.clock.setFixedTime(new Date("2026-11-06T12:00:00Z"));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#world canvas").waitFor({ state: "visible" });
  assert.equal(
    await page.locator(".arcade").getAttribute("href"),
    "https://intrepion.github.io/",
  );
  await page.locator("#start").click();
  // The ordinary navigation buttons use the same walk/action route as world clicks.
  await dialog("guide");
  await page.locator('[data-quest="forge"]').click();
  await page.locator('[data-quest="hearth"]').click();
  await page.locator('[data-quest="watch"]').click();
  assert.equal(
    await page.locator('[data-quest="forge"]').textContent(),
    "Complete quest",
  );
  await page.keyboard.press("Escape");
  console.log("Browser QA: quests accepted");
  await page.locator("#run").click();
  await action("copper1");
  await waitText("You receive copper ore");
  assert.equal(await page.locator('[data-item-id="copper"]').count(), 1);
  await action("tin1");
  await waitText("You receive tin ore");
  await action("furnace");
  await waitText("You smelt a bronze bar");
  assert.equal(await page.locator('[data-item-id="bar"]').count(), 1);
  await action("anvil");
  await waitText("You forge a bronze dagger");
  assert.equal(await page.locator('[data-item-id="dagger"]').count(), 1);
  await dialog("guide");
  await page.locator('[data-quest="forge"]').click();
  assert.equal(
    await page.locator('[data-quest="forge"]').textContent(),
    "Completed ✓",
  );
  await page.keyboard.press("Escape");
  console.log("Browser QA: bronze chain and quest reward passed");
  await dialog("bank");
  await page.locator('[data-deposit="axe"]').click();
  assert.equal(await page.locator('[data-item-id="axe"]').count(), 0);
  await page.locator('[data-withdraw="axe"]').click();
  assert.equal(await page.locator('[data-item-id="axe"]').count(), 1);
  await page.keyboard.press("Escape");
  await dialog("shop");
  await page.locator('[data-buy="sword"]').click();
  await page.keyboard.press("Escape");
  await page.locator('[data-item-id="sword"]').click();
  assert.equal(await page.locator("#weapon").textContent(), "Bronze sword");
  console.log("Browser QA: banking, shop and equip passed");
  await action("fish1");
  await page.waitForFunction(
    () => document.querySelectorAll('[data-item-id="raw"]').length >= 5,
    null,
    { timeout: 60000 },
  );
  await page.locator("#stop").click();
  await action("range");
  await waitText("You successfully cook some shrimps", 30000);
  await page.waitForFunction(
    () => !document.querySelector('[data-item-id="raw"]'),
    null,
    { timeout: 30000 },
  );
  await action("tree1");
  await waitText("You receive logs", 40000);
  await page.locator("#stop").click();
  await page.locator('[data-item-id="logs"]').first().click();
  assert.equal(await page.locator("#campfire").isVisible(), true);
  await waitText("You light a fire");
  await page.locator('[data-tab="skills"]').click();
  assert.match(await page.locator("#tab-body").textContent(), /Smithing/);
  await page.locator('[data-tab="pack"]').click();
  console.log("Browser QA: gathering, cooking and firemaking passed");
  await action("rat1");
  await waitText("You defeat the giant rat", 90000);
  await page.locator("#loot").click();
  assert.ok(await page.locator('[data-item-id="bones"]').count());
  await page.locator('[data-item-id="bones"]').first().click();
  await waitText("You bury the bones");
  console.log("Browser QA: combat and loot passed");
  await page.locator("#pause").click();
  const before = await page.locator("#activity").getAttribute("data-tick");
  await page.waitForTimeout(1500);
  assert.equal(
    await page.locator("#activity").getAttribute("data-tick"),
    before,
  );
  await page.locator("#resume").click();
  await page.locator("#help").click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#overlay").isHidden(), true);
  await page.locator("#pause").click();
  await page.locator("#resume").click();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.locator("#start").textContent(),
    "Continue adventure →",
  );
  await page.locator("#start").click();
  assert.equal(await page.locator("#weapon").textContent(), "Bronze sword");
  await page.locator('[data-tab="quests"]').click();
  assert.match(await page.locator("#tab-body").textContent(), /COMPLETE/);
  // Real world click, not just accessible travel controls.
  const canvas = page.locator("#world canvas");
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box.width * 0.48, y: box.height * 0.62 },
  });
  await page.waitForTimeout(800);
  assert.ok(
    Number(await page.locator("#activity").getAttribute("data-tick")) > 0,
  );
  await page.locator("#about").click();
  await page.locator("#reset").click();
  await page.locator("#cancel-reset").click();
  assert.equal(await page.locator("#overlay").isHidden(), true);
  assert.equal(await page.locator("#weapon").textContent(), "Bronze sword");
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.locator("#start").click();
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.locator('[data-tab="skills"]').click();
  await mobile.locator('[data-tab="quests"]').click();
  await mobile.locator("#help").click();
  await mobile.locator("#return-game").click();
  await mobile.screenshot({
    path: "/tmp/embervale-mobile.png",
    fullPage: true,
  });
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: HTTP WebGL, backlink, quests, pathfinding, copper+tin smelting, smithing, quest reward, banking, shopping, equip, fishing, cooking, woodcutting, firemaking, combat, loot, bones, skills, pause, help, save/reload, world click, reset cancel, mobile overflow.",
  );
} finally {
  await app.close();
}
