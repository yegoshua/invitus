/**
 * Lighthouse is noisy run to run. Reporting the median run — a real single
 * measurement, not an average of several — keeps the baseline reproducible
 * without inventing a run that never happened.
 */

/** Ranked on LCP: the metric #34 is about, and the one that moves the most. */
const RANK_BY = "largest-contentful-paint";

/**
 * @param {Array<Record<string, number>>} runs metrics from each run
 * @returns {Record<string, number>} the lower-middle run by LCP
 */
export function pickMedianRun(runs) {
  if (!runs.length) throw new Error("no runs to take a median of");

  const sorted = [...runs].sort((a, b) => a[RANK_BY] - b[RANK_BY]);
  return sorted[Math.ceil(sorted.length / 2) - 1];
}
