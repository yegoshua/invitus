import { test } from "node:test";
import assert from "node:assert/strict";

import { scheduleIdleAfterLoad } from "./idle-after-load.ts";

/** A stand-in for the browser, so the scheduling rules are testable without one. */
function browser({ loaded = false, saveData = false } = {}) {
  const loadListeners: Array<() => void> = [];
  const idleCallbacks: Array<() => void> = [];
  let hasLoaded = loaded;

  const fake = {
    unsubscribedFromLoad: 0,
    cancelledIdle: 0,
    idleRequests: 0,
    fireLoad() {
      hasLoaded = true;
      loadListeners.splice(0).forEach((run) => run());
    },
    goIdle() {
      idleCallbacks.splice(0).forEach((run) => run());
    },
    deps: {
      saveData,
      hasLoaded: () => hasLoaded,
      onLoad: (run: () => void) => {
        loadListeners.push(run);
        return () => {
          fake.unsubscribedFromLoad += 1;
        };
      },
      whenIdle: (run: () => void) => {
        fake.idleRequests += 1;
        idleCallbacks.push(run);
        return () => {
          fake.cancelledIdle += 1;
        };
      },
    },
  };

  return fake;
}

test("does not run before the load event", () => {
  let ran = 0;
  const b = browser();

  scheduleIdleAfterLoad(() => ran++, b.deps);
  b.goIdle();

  assert.equal(ran, 0, "idle time before load is not the idle time we want");
  assert.equal(b.idleRequests, 0, "nothing should even ask for idle time yet");
});

test("runs on idle time once the page has loaded", () => {
  let ran = 0;
  const b = browser();

  scheduleIdleAfterLoad(() => ran++, b.deps);
  b.fireLoad();
  assert.equal(ran, 0, "load alone is not enough — it waits for a quiet moment");

  b.goIdle();
  assert.equal(ran, 1);
});

test("a page that has already loaded goes straight to waiting for idle", () => {
  let ran = 0;
  const b = browser({ loaded: true });

  scheduleIdleAfterLoad(() => ran++, b.deps);
  assert.equal(ran, 0);

  b.goIdle();
  assert.equal(ran, 1);
});

test("does nothing at all under save-data", () => {
  let ran = 0;
  const b = browser({ loaded: true, saveData: true });

  scheduleIdleAfterLoad(() => ran++, b.deps);
  b.fireLoad();
  b.goIdle();

  assert.equal(ran, 0);
  assert.equal(
    b.idleRequests,
    0,
    "a metered connection is not asked for idle time either",
  );
});

test("cancelling before the load event unsubscribes and never runs", () => {
  let ran = 0;
  const b = browser();

  scheduleIdleAfterLoad(() => ran++, b.deps)();
  assert.equal(b.unsubscribedFromLoad, 1);

  b.fireLoad();
  b.goIdle();
  assert.equal(ran, 0);
});

test("cancelling between load and idle cancels the idle request", () => {
  let ran = 0;
  const b = browser();

  const cancel = scheduleIdleAfterLoad(() => ran++, b.deps);
  b.fireLoad();
  cancel();
  assert.equal(b.cancelledIdle, 1);

  b.goIdle();
  assert.equal(ran, 0);
});

test("runs at most once", () => {
  let ran = 0;
  const b = browser();

  scheduleIdleAfterLoad(() => ran++, b.deps);
  b.fireLoad();
  b.goIdle();
  b.goIdle();

  assert.equal(ran, 1);
});
