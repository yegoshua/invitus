// Does the belt in "Чому наші пояси — це база" sit on the coral, or on a black
// rectangle?
//
// The scrub video is transparent, and no single codec carries transparency in
// every engine: Chromium and Firefox composite VP9/WebM alpha, WebKit drops it
// and paints black, and only WebKit composites HEVC-with-alpha. The rule that
// picks one is in lib/belt-scrub-source.ts; this is the check that the rule
// still holds in real engines, because nothing else fails when it stops
// holding — the video plays, the page renders, and the belt quietly sits on a
// black box on every iPhone.
//
// It loads the homepage in a real engine, walks to the section, lets the video
// load (dispatching the touchstart the section waits for on phones), seeks
// into the clip, screenshots the page and samples the corners of the drawn
// picture. Coral means transparent; anything else fails.
//
//   npx -y playwright@1.63 install webkit chromium firefox   # once
//   pnpm check:scrub webkit                                  # dev server on :3000
//   pnpm check:scrub chromium http://localhost:3000/ --mobile
//
// Run it on WebKit above all: that is the engine the fix is for, and the one a
// Chrome-only check cannot stand in for. Playwright is not a project dependency
// — install it beside the repo (`npx -y playwright@1.63` above resolves it) or
// point NODE_PATH at a copy.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const [, , name = "webkit", url = "http://localhost:3000/", ...flags] = process.argv;
const mobile = flags.includes("--mobile");

// `require`, not `import`: only the CommonJS resolver honours NODE_PATH, which
// is how a Playwright installed outside the repo is found.
let pw;
try {
  pw = createRequire(import.meta.url)("playwright");
} catch {
  console.error(
    "playwright is not installed. Run `npx -y playwright@1.63 install webkit` and re-run with NODE_PATH pointing at a directory containing node_modules/playwright."
  );
  process.exit(2);
}
const { chromium, firefox, webkit, devices } = pw;
const engine = { chromium, firefox, webkit }[name];
if (!engine) {
  console.error(`unknown engine "${name}" — use webkit, chromium or firefox`);
  process.exit(2);
}

const browser = await engine.launch();
const context = await browser.newContext(
  mobile ? { ...devices["iPhone 13"], hasTouch: true } : { viewport: { width: 1280, height: 800 } }
);
const page = await context.newPage();
await page.goto(url, { waitUntil: "load" });
// On phones the section starts loading on the first touch; a real tap is a
// user activation, which a synthetic touchstart event is not.
if (mobile) await page.touchscreen.tap(10, 10);

const info = await page.evaluate(async (mobile) => {
  const heading = [...document.querySelectorAll("h2")].find((h) =>
    h.textContent?.includes("це база")
  );
  const container = heading?.closest("[style*='700vh']");
  const video = container?.querySelector("video");
  if (!container || !video) return { missing: true };
  const top = container.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, top + 40);

  const started = performance.now();
  let touched = false;
  while (performance.now() - started < 30000) {
    if (video.currentSrc && !touched) {
      touched = true;
      // What a thumb on the screen does on a phone: the section's activate().
      // Phones only — on a desktop nothing touches the page, and dispatching it
      // anyway would play() the video into loading on a page where Safari
      // otherwise never would.
      if (mobile) {
        document.documentElement.dispatchEvent(new Event("touchstart"));
        await new Promise((r) => setTimeout(r, 300));
      }
      // No `video.load()` here, deliberately. The section has `preload="none"`
      // and WebKit honours it strictly — nothing but the page's own load() or
      // play() ever fetches the source — so a probe that loads it itself passes
      // on a page where the belt never appears. Only the page may load it.
    }
    if (video.currentSrc && video.readyState >= 2) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  video.currentTime = 1.2;
  await new Promise((r) => setTimeout(r, 500));
  window.scrollTo(0, top + 40);
  await new Promise((r) => setTimeout(r, 500));

  const r = video.getBoundingClientRect();
  return {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    error: video.error?.code ?? null,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    dpr: devicePixelRatio,
  };
}, mobile);

if (info.missing) {
  console.error("section or video not found on the page");
  await browser.close();
  process.exit(2);
}

const shot = path.join(process.cwd(), `belt-scrub-${name}${mobile ? "-mobile" : ""}.png`);
await page.screenshot({ path: shot });
await browser.close();

// Read pixels back without a PNG dependency: the PNG is re-decoded by the
// engine itself in a throwaway page.
const pixels = await (async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const data = fs.readFileSync(shot).toString("base64");
  const { x, y, w, h } = info.rect;
  const aspect = 1920 / 1384;
  let pw = w, ph = w / aspect;
  if (ph > h) { ph = h; pw = h * aspect; }
  const px0 = x + (w - pw) / 2, py0 = y + (h - ph) / 2;
  const points = {
    topLeft: [px0 + pw * 0.06, py0 + ph * 0.06],
    topRight: [px0 + pw * 0.94, py0 + ph * 0.06],
    bottomLeft: [px0 + pw * 0.06, py0 + ph * 0.94],
    // The belt itself, at t=1.2s. Coral here means no frame was ever drawn: a
    // transparent video that never loaded passes every corner and shows nothing.
    belt: [px0 + pw * 0.5, py0 + ph * 0.7],
  };
  const out = await p.evaluate(
    async ([data, points, dpr]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const res = {};
      for (const [k, [px, py]] of Object.entries(points)) {
        res[k] = [...ctx.getImageData(Math.round(px * dpr), Math.round(py * dpr), 1, 1).data.slice(0, 3)];
      }
      return res;
    },
    [data, points, info.dpr]
  );
  await b.close();
  return out;
})();

const coral = [231, 66, 35];
const distance = (c) => Math.hypot(...c.map((v, i) => v - coral[i]));
const { belt, ...corners } = pixels;
const pass =
  info.readyState >= 2 &&
  Object.values(corners).every((c) => distance(c) < 40) &&
  distance(belt) >= 40;

console.log(
  JSON.stringify({ engine: name, mobile, readyState: info.readyState, error: info.error, corners: pixels, screenshot: shot, PASS: pass }, null, 2)
);
process.exit(pass ? 0 : 1);
