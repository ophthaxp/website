/**
 * The small rules Caseroom's screens share: levels, scores, and how a date is
 * said out loud.
 *
 * All of it is presentation. The platform decides what a doctor's XP is and
 * what a case scored; nothing here changes a number, it only decides how one is
 * drawn.
 */

import type { GradedMetric, HistoryEntry } from "./types";

/** Where a doctor starts, before their first case. */
export const STARTING_XP = 10;

const LEVEL_NAMES: Record<number, string> = {
  1: "Novice",
  2: "Beginner",
  3: "Amateur",
  4: "Apprentice",
  5: "Resident",
  6: "Senior Resident",
  7: "Fellow",
  8: "Specialist",
  9: "Consultant",
  10: "Legend",
};

/** Level 1–10, ten XP to a level. Mirrors `levelFromXp` on the platform. */
export function levelFromXp(xp: number): number {
  return Math.min(10, Math.max(1, Math.ceil(xp / 10)));
}

export function levelName(level: number): string {
  return LEVEL_NAMES[level] || `Level ${level}`;
}

/**
 * The categories the platform scored on before legends could define their own.
 *
 * Kept only as a fallback. An attempt now carries `graded`, which is the list it
 * was actually judged against — including a legend's custom categories — so
 * `gradedMetrics` below prefers that and falls back here for older attempts
 * saved before the field existed.
 */
const METRIC_NAMES: Record<string, string> = {
  diagnostic_accuracy: "Diagnostic accuracy",
  reasoning_process: "Reasoning process",
  red_flag_recognition: "Red-flag recognition",
  appropriate_investigation: "Appropriate investigation",
  knowing_when_to_refer: "Knowing when to refer",
};

/**
 * What a case was scored on, newest shape first.
 *
 * An attempt from before custom categories has `metrics` and no `graded`; one
 * from after has both. Reading `graded` when it is there means a legend's own
 * categories appear under the names they chose, rather than being dropped
 * because they are not in the list above.
 */
export function gradedMetrics(source: {
  graded?: GradedMetric[];
  metrics?: Record<string, number | null>;
}): GradedMetric[] {
  if (source.graded?.length) return source.graded;

  const metrics = source.metrics ?? {};
  return Object.entries(METRIC_NAMES)
    .filter(([key]) => typeof metrics[key] === "number")
    .map(([key, label]) => ({ key, label, score: metrics[key] as number }));
}

/** The reading name for a scored category, for the five the platform averages. */
export function metricLabel(key: string): string {
  return METRIC_NAMES[key] ?? prettyKey(key);
}

export type ScoreTier = "good" | "mid" | "bad";

export function scoreTier(score: number): ScoreTier {
  return score >= 7 ? "good" : score >= 4 ? "mid" : "bad";
}

/**
 * The three score colours.
 *
 * Deliberately not the brand terracotta. Terracotta means "this is ours" all
 * over the site — on a CTA, on a hover, on the bloom behind a card — and a
 * score of 3 out of 10 borrowing it would say the wrong thing twice: it would
 * read as branded, and it would read as good.
 *
 * They are muted rather than traffic-light bright because a logbook is a column
 * of them. Saturated green and red at that density stop being information and
 * start being decoration.
 */
export const TIER_COLOR: Record<ScoreTier, string> = {
  good: "#7FA98A",
  mid: "#D6A75F",
  bad: "#CF7A70",
};

export const TIER_TEXT: Record<ScoreTier, string> = {
  good: "text-[#7FA98A]",
  mid: "text-[#D6A75F]",
  bad: "text-[#CF7A70]",
};

/** "slit_lamp_lens" → "Slit lamp lens" */
export function prettyKey(key: string): string {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** mm:ss. Shown while working a case; never part of the score. */
export function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function dayNumber(date: string | Date): number {
  const d = new Date(date);
  return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/** "Today", "Yesterday", "4 days ago", then a date. */
export function relativeDay(date: string): string {
  const diff = dayNumber(new Date()) - dayNumber(date);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The line above the welcome.
 *
 * Computed in the browser on purpose: the server renders in whatever timezone
 * the deployment sits in, and telling a doctor in Chennai "good evening" over
 * their morning coffee is worse than the tiny flicker of it arriving a beat
 * late. Callers render it after mount for that reason.
 */
export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The XP a doctor is on, tolerant of a profile that has not loaded yet. */
export function xpOf(profile: { xp?: number } | null): number {
  return profile?.xp ?? STARTING_XP;
}

/**
 * Oldest-first XP readings, for the progress line.
 *
 * Seeded with the XP the doctor held *before* their first case, which the
 * platform records on every attempt. Without it one case is a single point,
 * and a single point is not a line — the chart drew an empty grid for
 * everybody until their second case. The seed is a real reading, not a made-up
 * zero: it is where they actually started.
 */
export function xpSeries(history: HistoryEntry[]): number[] {
  if (history.length === 0) return [];

  const oldestFirst = [...history].reverse();
  return [oldestFirst[0].before, ...oldestFirst.map((entry) => entry.after)];
}
