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
| Transfer before `load` | **37.29 MiB** | ≤ 3 MiB |
| Speed Index | 2.34 s | < 4 s |
| CLS | 0 | 0 |
| TBT | 17 ms | 200 ms (soft) |
| FCP | 1.06 s | — |
| Time to Interactive | 5.77 s | — |
| Main-thread work | 1.27 s | — |

58 of the run's 60 requests start before the load event (which fires at 240 ms
locally); over the whole run the page transfers 37.31 MiB, so essentially
nothing arrives late today. **36.51 MiB of it is media** — ten requests, four
video files, three of them below the fold. Scripts are 0.55 MiB, of which a
single 275 KiB chunk (three.js, pulled in by the prefetched product route) is
essentially unused on this page.
