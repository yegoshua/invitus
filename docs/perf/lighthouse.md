# Homepage performance budget

One command answers "did that help?":

```bash
pnpm perf:lighthouse
```

It builds for production, serves the build on port 4318, measures the homepage
three times with Lighthouse in a mobile profile, and reports the **median run**
against `perf/budget.json`. Exit code 0 means within budget, 1 means over.

```
pnpm perf:lighthouse --skip-build        # measure the .next build you already have
pnpm perf:lighthouse --runs 1            # one run instead of the median of three
pnpm perf:lighthouse --url /shop/belts   # a different page
pnpm perf:lighthouse --label before       # names the saved report
pnpm perf:lighthouse --port 4319         # if 4318 is taken
```

Reports are written to `perf/reports/<label>.html` and `.json` (git-ignored).
`pnpm test:perf` covers the budget evaluator and the median picker.

## The budget

`perf/budget.json` holds the thresholds, agreed in
[#34](https://github.com/yegoshua/invitus/issues/34):

| Metric | Threshold | |
| --- | --- | --- |
| Largest Contentful Paint | < 2.5 s | gate |
| Transfer weight before `load` | ≤ 3 MiB | gate |
| Speed Index | < 4 s | gate |
| Cumulative Layout Shift | 0 | gate |
| Total Blocking Time | 200 ms | **soft target** |

TBT is soft on purpose. #34 decided to leave the GSAP scrub logic and analytics
alone, and those put a floor under it; missing 200 ms is the expected
consequence of that decision, not a failure. `soft` in the budget file is the
list of metrics that warn instead of failing the run.

The `budgets` array borrows the Lighthouse budget format because it is a good
shape for this, but Lighthouse itself no longer reads it — budgets were a pre-10
feature and are gone in 13.x — and one meaning differs from that format: a
`resourceSizes` entry of `resourceType: "total"` means bytes transferred
*before the load event* here, where Lighthouse meant all of them.
`scripts/perf/evaluate-budget.mjs` is what enforces the thresholds.

## What the numbers do and do not include

- **Chrome is clean.** `chrome-launcher` starts a throwaway user-data-dir with
  extensions disabled. This is the whole point of the harness: the report that
  started #34 was taken with MetaMask, Phantom, Google AI Studio, Tag Assistant
  and AdBlock live, and roughly 2 MB of its "unused JavaScript" was theirs.
- **Analytics does not load.** Clarity switches itself off on `localhost` and GA
  needs `NEXT_PUBLIC_GA_ID`, so neither runs here. Local TBT is therefore lower
  than production TBT and the two are not comparable. Another reason TBT is a
  target rather than a gate.
- **Transfer weight counts requests that started before the load event**, which
  is the line #34 draws. Media that only begins downloading after load — the
  point of the lazy-loading work — correctly does not count. Watch this one: on
  localhost the load event fires within a few hundred milliseconds, so the
  window is narrow and a deferral of a few milliseconds would slip a video out
  of the gate without helping a real visitor at all. The report prints the
  whole-run transfer and the load timestamp beside the gated figure for exactly
  that reason — if a change collapses the gated number while the whole-run
  number stays put, the bytes moved, they did not go away.
- **The server is local**, so TTFB is a few milliseconds rather than the 130 ms
  the live site shows. Network conditions are Lighthouse's simulated mobile 4G.

## Baseline — unmodified `main`, 2026-08-02

Captured before any of #34's product changes, at `606e317`, Lighthouse 13.4.1,
mobile, median of 3 runs, clean profile. This is the fixed point every later
ticket compares against; it is also posted on
[#34](https://github.com/yegoshua/invitus/issues/34).

| Metric | Baseline | Target |
| --- | --- | --- |
| Performance score | 82 | — |
| LCP | **4.84 s** | < 2.5 s |
| Transfer before `load` | **36.94 MiB** | ≤ 3 MiB |
| Speed Index | 2.29 s | < 4 s |
| CLS | 0 | 0 |
| TBT | 18 ms | 200 ms (soft) |
| FCP | 1.05 s | — |
| Time to Interactive | 5.77 s | — |
| Main-thread work | 1.16 s | — |

58 of the run's 60 requests start before the load event (which fires at 185 ms
locally); over the whole run the page transfers 36.95 MiB, so essentially
nothing arrives late today. **36.15 MiB of it is media** — ten requests, four
video files, three of them below the fold. Scripts are 0.55 MiB, of which a
single 275 KiB chunk (three.js, pulled in by the prefetched product route) is
essentially unused on this page.

## After #37 — the hero paints from a poster

| Metric | Baseline | After #37 |
| --- | --- | --- |
| Performance score | 82 | 85 |
| LCP | 4.84 s | 4.29 s |
| Transfer before `load` | 36.94 MiB | 20.61 MiB |
| Transfer, whole run | 36.95 MiB | 22.03 MiB |
| Speed Index | 2.29 s | 2.28 s |
| CLS | 0 | 0 |

The LCP element is no longer the hero video but the 19 KB poster beside it,
which lands at 53 ms observed. The two transfer figures are quoted together
because the doc's own warning applies here: the gate fell by 16.3 MiB but the
whole run only fell by 14.9 MiB, and the 1.4 MiB of difference is exactly the
re-encoded video, which moved rather than vanished — it starts downloading a
few milliseconds after the load event. The other 14.9 MiB is genuinely gone,
burnt out of the encode.

**LCP barely moved, and the reason is worth writing down.** Observed LCP in the
trace is 69 ms — the poster paints essentially immediately. The 4.29 s is
Lighthouse's *simulated* figure, and simulation is where the remaining cost
lives: FCP alone simulates at 1.06 s, and the gap after it does not close when
the other media goes away. Measured with the three below-the-fold video
sections commented out — 1.05 MiB before load, whole run 2.78 MiB — LCP was
still 3.95 s. So what is left is main-thread work under the 4× CPU multiplier,
not bytes: the same scripts that put TTI at 7 s in that run. Deferring the rest
of the media (#38, #41, #42) will collapse the transfer gate; the LCP gate
needs the script work — #39 gets three.js off this page.

## After #38 — the motivation video waits for the viewport

| Metric | Baseline | After #37 | After #38 |
| --- | --- | --- | --- |
| Performance score | 82 | 85 | 85 |
| LCP | 4.84 s | 4.29 s | 4.29 s |
| Transfer before `load` | 36.94 MiB | 20.61 MiB | **18.27 MiB** |
| Transfer, whole run | 36.95 MiB | 22.03 MiB | **19.69 MiB** |
| Speed Index | 2.29 s | 2.28 s | 2.28 s |
| CLS | 0 | 0 | 0 |
| TBT | 18 ms | — | 20 ms |

The gate and the whole run both fell by the same 2.34 MiB, which is the reading
this doc asks for: the bytes did not move a few milliseconds past the load
event, they did not travel at all. Lighthouse never scrolls, so the section is
never approached and the video is never requested — which is exactly the
behaviour a visitor who bounces off the hero gets.

The file itself is 2.90 MiB; the 2.34 MiB is what the earlier trace had managed
to transfer before it ended, so that is the honest figure for what this change
removes from the measurement rather than the file's full weight.

LCP and Speed Index are unchanged, as expected — [#37](https://github.com/yegoshua/invitus/issues/37)
already established that what remains of LCP here is simulated main-thread work
rather than bytes. The transfer gate is still over budget by 15.27 MiB, all of
it the belt scrub video downloading twice: [#42](https://github.com/yegoshua/invitus/issues/42).

Behaviour that the budget cannot see was checked separately, in headless Chrome
driven by puppeteer (the agent browser panes run the page as a hidden tab, where
`IntersectionObserver` never delivers): zero requests for the video at load;
exactly one once the section is approached, buffered to `readyState 4` and
playing before it is on screen; paused after scrolling past and playing again on
the way back; and under `prefers-reduced-motion: reduce` no request at all, with
the section keeping its 500 px box and dropping its mute button.

## After #41 — the testimonials carousel waits too

| Metric | Baseline | After #38 | After #41 |
| --- | --- | --- | --- |
| Performance score | 82 | 85 | 85 |
| LCP | 4.84 s | 4.29 s | 4.29 s |
| Transfer before `load` | 36.94 MiB | 18.27 MiB | **10.02 MiB** |
| Transfer, whole run | 36.95 MiB | 19.69 MiB | **11.75 MiB** |
| Speed Index | 2.29 s | 2.28 s | 2.12 s |
| CLS | 0 | 0 | 0 |

The three testimonial files are 0.6, 9.0 and 3.3 MB, and `START_INDEX` lands on
the 9.0 MB one — which is why one section accounted for most of what the gate
lost here.

What is left before `load` is now almost entirely one file:

| | starts | transferred |
| --- | --- | --- |
| `belt-benefits-section-video-scrub.webm` | 51 ms | **9.52 MiB** |
| the three.js chunk | 163 ms | 0.27 MiB |
| `hero-section.mp4` | 147 ms | 1.41 MiB — *after* the load event at 120 ms, so outside the gate |

So the transfer gate is one ticket away from budget: [#42](https://github.com/yegoshua/invitus/issues/42)
takes the scrub off the load path, and [#39](https://github.com/yegoshua/invitus/issues/39)
takes the three.js chunk. Note that this run captured the scrub **once**, not
twice — the second copy is a `fetch(...).blob()` from an effect and lands at
different points in different traces, which is another reason #42 should assert
the request count in a network trace rather than infer it from the total.

Behaviour, again checked in headless Chrome rather than by the budget: zero
requests for any testimonial at load; three once the section is approached, of
which only the selected one plays; the Next arrow moves playback with the
selection; the mute control still mutes all three, as it did before; playback
pauses on the way past and resumes — on the same card, not from the start — on
the way back.

## After #42 — the belt scrub loads once, and after the page

| Metric | Baseline | After #41 | After #42 |
| --- | --- | --- | --- |
| Performance score | 82 | 85 | 85 |
| LCP | 4.84 s | 4.29 s | 4.28 s |
| Transfer before `load` | 36.94 MiB | 10.02 MiB | **0.50 MiB** ✔ |
| Transfer, whole run | 36.95 MiB | 11.75 MiB | 11.75 MiB |
| Speed Index | 2.29 s | 2.12 s | 2.10 s |
| CLS | 0 | 0 | 0 |
| TBT | 18 ms | — | 10 ms |

**The transfer gate is met**: 0.50 MiB against a 3 MiB budget, down from 36.94.

The whole-run figure did not move, and that is the honest reading rather than an
oversight. #42 forbids touching the scrub's bytes, so the 9.52 MiB file still
arrives — it now starts at 130 ms, after the load event at 88 ms, instead of at
51 ms before it. The trace confirms it as **one request** where it used to be
two: the element carried `preload="auto"` *and* an effect fetched the same file
into a blob, and both pulled all of it.

Worth stating plainly, because the gate does not: on a mobile viewport the
section sits about two screens down and the load margin is two screens, so the
scrub begins downloading shortly after `load` even for a visitor who never
scrolls to it. That is deliberate — a 9.6 MB file needs the head start to be
ready on arrival, and #34 put both re-encoding it and replacing it with an image
sequence out of scope. The remaining lever is the asset, not the timing.

Behaviour, checked in headless Chrome against a build of the previous branch as
well as this one, so "unchanged" means compared rather than assumed:

- 0 requests for the scrub at `load`, exactly 1 in total (before: 1 at load, 2 in
  total)
- `duration` reads 14.167 s and the timeline sets up, so the section is driven as
  before
- `currentTime` at five scroll positions through the pinned section, and at two
  on the way back, is **identical to the previous branch to the centisecond**
  (0.82 → 5.11 → 7.83 → 8.96 → 9.00, back 7.83 → 0.82)
- card opacities at those same positions are identical too, including the
  forward/back asymmetry the existing `onEnter`/`onLeaveBack` snap produces —
  pre-existing, and #42 leaves the GSAP logic alone

There is no longer a blob *swap* to preserve scrub position across: the file is
fetched once and the blob URL is the only source the element ever has. The old
`currentTime + 0.01` nudge existed to repair that swap and is gone with it.

## After #39 — three.js leaves the homepage's dependency graph

| Metric | Baseline | After #42 | After #39 |
| --- | --- | --- | --- |
| Performance score | 82 | 85 | 86 |
| LCP | 4.84 s | 4.28 s | 4.22 s |
| Transfer before `load` | 36.94 MiB | 0.50 MiB | **0.50 MiB** ✔ |
| Speed Index | 2.29 s | 2.10 s | 2.15 s |
| CLS | 0 | 0 | 0 |
| TBT | 18 ms | 10 ms | 60 ms (soft target: 200 ms) |
| Unused JavaScript | — | 345 KiB | **281 KiB** |

**Read this one carefully, because the headline number does not move and that is
not a mistake.** #34's acceptance criterion expected the homepage's unused-JS
figure to fall by roughly 283 KB. It falls by 64 KiB. The reason is that #34
also requires the chunk to be **warmed** rather than merely deferred — so a
normal visitor still downloads it, by choice, in idle time. The 283 KB did not
leave the page; it stopped being unavoidable.

There is a second reason the gate figure is flat: by the time #38–#42 had
landed, the load event had moved from 185 ms to 103 ms and the prefetch-driven
three.js chunk was *already* starting after it. Against the #35 baseline this
change is worth 283 KB inside the gate; against the branch it follows, nothing.
Both readings are true and the second is the one this table shows.

What the change is actually worth, and what was verified in a network trace
rather than reasoned about:

- **The cause is fixed.** With `save-data` set, the product route is still
  prefetched — #34 leaves prefetch enabled — and it now pulls 10 KB + 27 KB
  instead of dragging the 1 MB three.js chunk behind it. That is the proof that
  three.js has left the route's entry chunk rather than merely being scheduled
  differently.
- **Under `save-data` it is never speculatively fetched at all**, where before it
  arrived on every homepage visit.
- **The idle warm-up fires only after `load`** — the chunk appears in the trace
  only after the load event, and the rule itself is unit-tested in
  `lib/idle-after-load.test.ts`, which is where #39's "single easiest way to get
  this wrong" is pinned down.
- **Intent still warms under `save-data`**: hovering a product card fetches the
  chunk immediately. Deferring is not the same as refusing.
- **The product page renders without waiting for 3D.** At `DOMContentLoaded` the
  name, price, 23 size buttons and the add-to-cart button are all present and
  the canvas count is 0; the canvas arrives afterwards.

TBT rose from 10 ms to 60 ms, which is the idle warm-up doing its work inside
the trace window. It is a soft target of 200 ms and this is comfortably inside
it. The LCP gate is still the open one, and #37's finding stands: with all media
removed LCP still simulated at 3.95 s, so what remains is main-thread work under
the 4× CPU multiplier rather than bytes. #43 is where that gets confronted
against a real deployment instead of a simulation.
