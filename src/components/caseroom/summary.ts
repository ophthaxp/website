/**
 * The derived figures the Your Space pane reports.
 *
 * The platform sends totals — cases, accuracy, streaks, per-category averages.
 * What it does not send is *movement*: whether a doctor is getting better, and
 * at what. That is what the pane is for, so it is worked out here.
 *
 * Every figure returns null rather than zero when there is not enough history
 * to support it. A doctor two cases in should be shown two real numbers and no
 * trend, not a trend of zero — an invented figure here makes the real ones
 * beside it worthless.
 */

import { metricLabel } from "./scoring";
import type { HistoryEntry, ProfileStats } from "./types";

/** Below this there is no "recently" worth comparing against "before". */
const MIN_FOR_TREND = 4;

/** History arrives newest-first. Split it in two to compare then with now. */
function halves(history: HistoryEntry[]): [HistoryEntry[], HistoryEntry[]] {
  const cut = Math.floor(history.length / 2);
  return [history.slice(0, cut), history.slice(cut)];
}

function accuracyOf(entries: HistoryEntry[]): number | null {
  if (entries.length === 0) return null;
  return (entries.filter((e) => e.correct).length / entries.length) * 100;
}

function averageMetric(entries: HistoryEntry[], key: string): number | null {
  const scores = entries
    .map((e) => e.metrics?.[key])
    .filter((v): v is number => typeof v === "number");
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Cases finished in the last seven days. */
export function casesThisWeek(history: HistoryEntry[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return history.filter((entry) => {
    const at = new Date(entry.date).getTime();
    return Number.isFinite(at) && at >= cutoff;
  }).length;
}

/**
 * How far accuracy has moved, in percentage points, recent half against older.
 *
 * Points rather than a percentage of a percentage: going from 40% to 71% is
 * reported as +31, which is what the number means and what a reader assumes.
 */
export function accuracyMovement(history: HistoryEntry[]): number | null {
  if (history.length < MIN_FOR_TREND) return null;

  const [recent, earlier] = halves(history);
  const now = accuracyOf(recent);
  const before = accuracyOf(earlier);
  if (now === null || before === null) return null;

  return Math.round(now - before);
}

/** The best overall score in the recent half. */
export function recentHigh(history: HistoryEntry[]): number | null {
  if (history.length === 0) return null;

  const [recent] = halves(history);
  const pool = recent.length > 0 ? recent : history;
  const scores = pool.map((e) => e.overall).filter((v): v is number => typeof v === "number");
  if (scores.length === 0) return null;

  return Math.max(...scores);
}

/** The weakest scored category, by the platform's own averaging. */
export function weakestMetric(
  stats: ProfileStats,
): { key: string; label: string; score: number } | null {
  const key = stats.weakest;
  if (!key) return null;

  const score = stats.metric_averages?.[key];
  if (typeof score !== "number") return null;

  return { key, label: metricLabel(key), score };
}

/**
 * How many categories are scoring better lately than they were.
 *
 * The chip on the analysis card. Counted from the doctor's own scores rather
 * than read off Iris's prose, so the number and the sentence cannot disagree.
 */
export function improvingCount(history: HistoryEntry[], stats: ProfileStats): number {
  if (history.length < MIN_FOR_TREND) return 0;

  const [recent, earlier] = halves(history);
  let count = 0;

  for (const key of Object.keys(stats.metric_averages ?? {})) {
    const now = averageMetric(recent, key);
    const before = averageMetric(earlier, key);
    if (now !== null && before !== null && now > before) count += 1;
  }

  return count;
}

/**
 * Roughly how long one of this doctor's cases takes, as a range.
 *
 * Their own median, widened either side and rounded to five minutes. Derived
 * rather than a fixed "12–15 min" because case length depends on how somebody
 * works — a careful doctor is not running late — and quoting a number nobody
 * measured would be inventing a fact about them.
 *
 * Null until there is enough history to say, which is the honest answer for a
 * doctor who has not finished a case yet.
 */
export function typicalMinutes(history: HistoryEntry[]): { low: number; high: number } | null {
  const durations = history
    .map((e) => e.duration_sec)
    .filter((v): v is number => typeof v === "number" && v > 0)
    .sort((a, b) => a - b);

  if (durations.length < 3) return null;

  const median = durations[Math.floor(durations.length / 2)] / 60;
  const low = Math.max(5, Math.round((median * 0.8) / 5) * 5);
  const high = Math.max(low + 5, Math.round((median * 1.25) / 5) * 5);

  return { low, high };
}
