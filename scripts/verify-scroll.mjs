/*
 * End-to-end check for the cinematic scroll engine.
 *
 * The headline claim of this design is that transitions are *fully*
 * bidirectional — scrolling up must reverse the animation exactly, not
 * approximately. Screenshots alone cannot prove that, so this script also
 * measures the computed opacity of each act panel at a list of scroll offsets
 * on the way down, then visits the identical offsets on the way up and
 * asserts the values match. Any one-shot trigger or state latch would show up
 * here as a mismatch.
 *
 * Usage:  node scripts/verify-scroll.mjs [baseUrl]
 * Output: screenshots in .verify/, pass/fail summary on stdout.
 */

import { chromium } from "playwright-core";
import { mkdir, rm } from "node:fs/promises";

const BASE_URL = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT_DIR = ".verify";
const EXECUTABLE = "/opt/pw-browsers/chromium";

/**
 * Fractions of total scrollable height to sample. Spaced finely enough that
 * each act's fully-resolved plateau is actually hit — coarse sampling can
 * stride straight over a narrow one and report a false failure.
 */
const STOPS = [0, 0.1, 0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2 },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
];

/** Opacity tolerance. Sub-pixel scroll rounding makes exact equality unfair. */
const EPSILON = 0.02;

async function setScroll(page, y) {
  await page.evaluate(async (target) => {
    const lenis = window.__maktScroll;
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo(0, target);
    // Two frames: one for Lenis to commit, one for Motion to flush styles.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, y);
}

async function readActs(page) {
  return page.evaluate(() => {
    const panels = [...document.querySelectorAll("[data-act-panel]")];
    return panels.map((el) => ({
      index: Number(el.getAttribute("data-act-panel")),
      opacity: Number(getComputedStyle(el).opacity),
    }));
  });
}

async function run() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const failures = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      locale: "fa-IR",
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push(`[${viewport.name}] page error: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") failures.push(`[${viewport.name}] console: ${msg.text()}`);
    });

    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    // Give the procedural frame source time to finish its coarse pass.
    await page.waitForTimeout(900);

    const maxScroll = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );

    // ── Pass 1: downward ──────────────────────────────────────────────────
    const forward = [];
    for (const [i, stop] of STOPS.entries()) {
      const y = Math.round(maxScroll * stop);
      await setScroll(page, y);
      forward.push({ stop, y, acts: await readActs(page) });
      await page.screenshot({
        path: `${OUT_DIR}/${viewport.name}-down-${String(i).padStart(2, "0")}-${stop}.png`,
      });
    }

    // ── Pass 2: upward through the identical offsets ──────────────────────
    const reverse = [];
    for (const [i, stop] of [...STOPS].reverse().entries()) {
      const y = Math.round(maxScroll * stop);
      await setScroll(page, y);
      reverse.push({ stop, y, acts: await readActs(page) });
      await page.screenshot({
        path: `${OUT_DIR}/${viewport.name}-up-${String(i).padStart(2, "0")}-${stop}.png`,
      });
    }

    // ── Compare ───────────────────────────────────────────────────────────
    for (const down of forward) {
      const up = reverse.find((r) => r.stop === down.stop);
      if (!up) continue;
      for (const act of down.acts) {
        const mirror = up.acts.find((a) => a.index === act.index);
        if (!mirror) continue;
        const delta = Math.abs(act.opacity - mirror.opacity);
        if (delta > EPSILON) {
          failures.push(
            `[${viewport.name}] act ${act.index} at ${down.stop}: down=${act.opacity.toFixed(3)} up=${mirror.opacity.toFixed(3)} (Δ${delta.toFixed(3)})`,
          );
        }
      }
    }

    // Every act must actually reach full opacity somewhere, otherwise the
    // crossfade windows are mistuned and an act is never cleanly presented.
    for (let index = 0; index < 3; index++) {
      const peak = Math.max(
        ...forward.map((f) => f.acts.find((a) => a.index === index)?.opacity ?? 0),
      );
      if (peak < 0.95) {
        failures.push(
          `[${viewport.name}] act ${index} never fully resolves (peak opacity ${peak.toFixed(3)})`,
        );
      }
    }

    console.log(`\n── ${viewport.name} (${viewport.width}×${viewport.height}) ──`);
    console.log(`scrollable height: ${maxScroll}px`);
    for (const f of forward) {
      const cells = f.acts
        .sort((a, b) => a.index - b.index)
        .map((a) => `act${a.index}=${a.opacity.toFixed(2)}`)
        .join("  ");
      console.log(`  ${String(f.stop).padEnd(5)} y=${String(f.y).padStart(5)}  ${cells}`);
    }

    await context.close();
  }

  // ── Reduced motion: transitions must be hard cuts, never intermediate ──
  const rmContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    locale: "fa-IR",
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
  await rmPage.waitForTimeout(600);

  const rmHasLenis = await rmPage.evaluate(() => Boolean(window.__maktScroll));
  if (rmHasLenis) failures.push("[reduced-motion] Lenis was constructed despite the preference");

  const rmMax = await rmPage.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  for (const [i, stop] of STOPS.entries()) {
    await setScroll(rmPage, Math.round(rmMax * stop));
    const acts = await readActs(rmPage);
    for (const act of acts) {
      if (act.opacity > 0.01 && act.opacity < 0.99) {
        failures.push(
          `[reduced-motion] act ${act.index} at ${stop} is mid-fade (${act.opacity.toFixed(3)}); transitions must be instant`,
        );
      }
    }
    await rmPage.screenshot({ path: `${OUT_DIR}/reduced-${String(i).padStart(2, "0")}-${stop}.png` });
  }
  await rmContext.close();

  await browser.close();

  console.log("\n────────────────────────────────");
  if (failures.length === 0) {
    console.log("PASS — transitions are symmetric in both directions.");
  } else {
    console.log(`FAIL — ${failures.length} issue(s):`);
    for (const f of failures) console.log(`  • ${f}`);
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
