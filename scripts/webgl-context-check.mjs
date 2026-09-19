// Is the 3D belt actually broken, or is the console just talking?
//
// `THREE.WebGLRenderer: Context Lost.` shows up in the dev console on every
// product page load and looks exactly like the bug fixed in 7965d69 (a hole
// where the belt should be). It is not. In development React StrictMode mounts
// the viewer, unmounts it and mounts it again; @react-three/fiber's unmount
// schedules `gl.forceContextLoss()` on a 500 ms timer, and because StrictMode
// reuses the same <canvas> element, that timer fires into the live context of
// the second mount. ModelLoader catches it, rebuilds the canvas, and the belt
// renders. A production build never double-mounts, so it never happens there.
//
// Rather than re-derive that every time the message reappears, run this. It
// drives a clean headless Chrome — no extensions, no shared profile — over CDP,
// counts real `webglcontextlost` events, and checks what the page ended up
// showing. It fails only on the symptom that matters: a canvas whose context is
// dead, or no canvas at all (the photo fallback, meaning the viewer gave up).
//
//   pnpm check:webgl                                   # dev server on :3000
//   pnpm check:webgl <url> <runs> <settleMs> 390x844   # as a phone
//
// Check the phone viewport as well as the default one. The product page builds
// two layouts and mounts the viewer into whichever is on screen, so a loss that
// only happens on mobile is invisible at desktop width.
//
// A dev run reporting one recovered loss per load is the expected result; a
// production run should report none. Measured at both widths, and resizing
// across the lg breakpoint without reloading costs two more (the desktop
// viewer's teardown plus the mobile one's own StrictMode remount) — still
// recovered, still a live canvas.
import { launch } from "chrome-launcher";

const url =
  process.argv[2] ?? "http://localhost:3000/product/akatsuki-lifting-belt";
const runs = Number(process.argv[3] ?? 3);
const settleMs = Number(process.argv[4] ?? 9000);
// "390x844" emulates a phone, media queries included, which is not the same
// page: the mobile and desktop layouts mount different viewers.
const viewport = process.argv[5] ?? null;

// Installed before any page script. Patching getContext is what lets us attach
// to every canvas the app creates, including the one it builds after a loss.
const PROBE = `
window.__webglCheck = { losses: [], contexts: 0 };
const original = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
  const ctx = original.call(this, type, ...rest);
  if (ctx && String(type).indexOf('webgl') === 0) {
    window.__webglCheck.contexts++;
    const getExtension = ctx.getExtension.bind(ctx);
    ctx.getExtension = function (name) {
      const ext = getExtension(name);
      if (name === 'WEBGL_lose_context' && ext && !ext.__wrapped) {
        const loseContext = ext.loseContext.bind(ext);
        ext.loseContext = function () {
          // The stack names whoever killed it — the whole point of the probe.
          window.__webglCheck.culprit = (new Error().stack || '')
            .split('\\n').slice(1, 6).map((l) => l.trim()).join(' <- ');
          return loseContext();
        };
        ext.__wrapped = true;
      }
      return ext;
    };
    this.addEventListener('webglcontextlost', (event) => {
      const record = { at: Math.round(performance.now()), recovered: null };
      window.__webglCheck.losses.push(record);
      // preventDefault is what makes recovery possible, and it is called by a
      // listener registered after this one — so read the flag on the next turn.
      setTimeout(() => { record.recovered = event.defaultPrevented; }, 0);
    });
  }
  return ctx;
};
`;

const REPORT = `(() => {
  const d = window.__webglCheck || { losses: [], contexts: 0 };
  const canvases = [...document.querySelectorAll('canvas')];
  return JSON.stringify({
    losses: d.losses,
    culprit: d.culprit ?? null,
    canvases: canvases.length,
    dead: canvases.filter((c) => {
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return gl ? gl.isContextLost() : false;
    }).length,
  });
})()`;

function connect(socket) {
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const waiting = message.id && pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(JSON.stringify(message.error)));
    else waiting.resolve(message.result);
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
}

const chrome = await launch({
  chromeFlags: [
    "--headless=new",
    "--disable-extensions",
    "--no-first-run",
    // SwiftShader, so the result does not depend on whose GPU this is.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--window-size=1440,900",
  ],
});

let failed = false;
try {
  const targets = await (
    await fetch(`http://127.0.0.1:${chrome.port}/json/list`)
  ).json();
  const page = targets.find((t) => t.type === "page");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const send = connect(socket);

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });

  if (viewport) {
    const [width, height] = viewport.split("x").map(Number);
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
    });
  }

  console.log(
    `${url} — ${runs} load(s), ${settleMs} ms each, ` +
      `${viewport ?? "default"} viewport\n`
  );

  for (let run = 1; run <= runs; run++) {
    await send("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    const { result } = await send("Runtime.evaluate", {
      expression: REPORT,
      returnByValue: true,
    });
    const data = JSON.parse(result.value);

    // The belt is missing if the surviving canvas is dead, or if there is no
    // canvas at all — ModelLoader drops to the photo once it stops retrying.
    const broken = data.dead > 0 || data.canvases === 0;
    failed ||= broken;

    const unrecovered = data.losses.filter((l) => l.recovered === false).length;
    console.log(
      `run ${run}: ${broken ? "BROKEN" : "ok"} — ` +
        `${data.losses.length} context loss(es)` +
        (unrecovered ? `, ${unrecovered} not recovered` : "") +
        `, ${data.canvases} canvas(es), ${data.dead} dead`
    );
    if (data.culprit) console.log(`         lost by: ${data.culprit}`);
  }

  socket.close();
} finally {
  await chrome.kill();
}

console.log(
  failed
    ? "\nThe page ended up without a working 3D canvas."
    : "\nEvery load ended with a live 3D canvas."
);
process.exit(failed ? 1 : 0);
