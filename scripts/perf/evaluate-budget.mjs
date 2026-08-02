/**
 * Compares a Lighthouse run against the thresholds committed in `perf/budget.json`.
 *
 * Lighthouse dropped its built-in budgets audit (it was a pre-10 feature and is
 * gone in 13.x), so the comparison lives here instead. `perf/budget.json` keeps
 * the original Lighthouse budget shape under `budgets` so it stays portable to
 * anything that still reads that format.
 */

/** Timing metrics are milliseconds; these two are not. */
const UNITLESS_METRICS = new Set(["cumulative-layout-shift"]);
const BYTE_METRICS = new Set(["transfer-before-load"]);

const KIB = 1024;

/**
 * @param {object} budgetFile parsed `perf/budget.json`
 * @param {Record<string, number>} measured metric id -> measured value
 *   (ms for timings, unitless for CLS, bytes for `transfer-before-load`)
 * @returns {{pass: boolean, results: Array<object>}} `pass` is false when any
 *   hard threshold is exceeded or any budgeted metric is missing from the run.
 */
export function evaluateBudget(budgetFile, measured) {
  const soft = new Set(budgetFile.soft ?? []);
  const results = thresholdsOf(budgetFile).map(({ metric, budget }) => {
    const raw = measured[metric];

    if (typeof raw !== "number" || Number.isNaN(raw)) {
      return {
        metric,
        budget,
        value: null,
        unit: unitOf(metric),
        soft: soft.has(metric),
        status: "missing",
      };
    }

    const value = BYTE_METRICS.has(metric) ? raw / KIB : raw;
    const within = value <= budget;

    return {
      metric,
      budget,
      value,
      unit: unitOf(metric),
      soft: soft.has(metric),
      status: within ? "pass" : soft.has(metric) ? "warn" : "fail",
    };
  });

  return {
    pass: results.every((r) => r.status === "pass" || r.status === "warn"),
    results,
  };
}

/** Flattens the Lighthouse-shaped `budgets` array into metric/threshold pairs. */
function thresholdsOf(budgetFile) {
  return (budgetFile.budgets ?? []).flatMap((entry) => [
    ...(entry.timings ?? []).map(({ metric, budget }) => ({ metric, budget })),
    ...(entry.resourceSizes ?? []).map(({ resourceType, budget }) => ({
      metric: resourceType === "total" ? "transfer-before-load" : resourceType,
      budget,
    })),
  ]);
}

function unitOf(metric) {
  if (BYTE_METRICS.has(metric)) return "KiB";
  if (UNITLESS_METRICS.has(metric)) return "";
  return "ms";
}
