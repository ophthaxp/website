/**
 * What LoMa sends back.
 *
 * These mirror `loma.types.ts` on the platform. They are written by hand rather
 * than shared, because the two codebases deploy separately and a type imported
 * across that line would go stale silently. Everything the UI does not read is
 * left out.
 */

/**
 * One scored category.
 *
 * A legend can define their own categories per program, so the list is not
 * fixed — which is why `graded` exists alongside the older `metrics` map, and
 * why the UI prefers it. See `METRIC_NAMES` in `scoring.ts` for the fallback.
 */
export interface GradedMetric {
  key: string;
  label: string;
  score: number;
}

/** One finished case, as it appears in the logbook. */
export interface HistoryEntry {
  id: number;
  case_id: string | null;
  title: string;
  date: string;
  correct: boolean;
  reasoning_quality: string;
  headline: string | null;
  overall: number | null;
  graded?: GradedMetric[];
  metrics: Record<string, number | null>;
  before: number;
  after: number;
  xp_reason: string | null;
  duration_sec: number;
  presenting_complaint: string;
  correct_diagnosis: string;
  final_diagnosis: string;
  final_reasoning: string;
  note: string | null;
}

/**
 * The counts LoMa works out server-side.
 *
 * The standalone app recomputed accuracy and the streak in the browser from
 * `history`. This does not: the server already computes them, over the full set
 * rather than the slice that happens to have been sent, and two implementations
 * of "what counts as a streak" is one too many.
 */
export interface ProfileStats {
  total_cases: number;
  correct_cases: number;
  accuracy: number;
  current_streak: number;
  best_streak: number;
  metric_averages: Record<string, number>;
  strongest: string | null;
  weakest: string | null;
  reasoning_counts: Record<string, number>;
}

/** A program this doctor has asked to join, or been added to. */
export interface Enrollment {
  program_id: number;
  program_name: string;
  topic: string;
  status: "pending" | "approved" | "rejected" | string;
  legend_name: string | null;
}

export type LomaRole = "student" | "legend" | "admin" | string;

export interface LomaProfile {
  user_id: string;
  name: string | null;
  email: string | null;
  role: LomaRole;
  xp: number;
  level: number;
  level_name: string;
  onboarded: boolean;
  topic: string | null;
  enrollments: Enrollment[];
  active_program_id: number | null;
  history: HistoryEntry[];
  stats: ProfileStats;
}

/** What the browser is allowed to know about a case in progress. */
export interface CaseSession {
  session_id: string;
  title: string;
  blurb: string;
  source: string;
  brief: {
    presenting_complaint: string;
    history: string;
    exam_visible: string;
  };
  /**
   * The findings that exist but have not been surfaced yet.
   *
   * Only the keys travel — never the findings themselves. The answers stay on
   * the server until the doctor has locked in, which is what stops the evidence
   * panel being a list of spoilers in the network tab.
   */
  withheld_keys: string[];
  objectives: string[];
}

/** A finding the doctor has uncovered. `critical` marks the red flag. */
export interface RevealedFinding {
  key: string;
  critical: boolean;
}

export interface CaseTurn {
  role: "trainee" | "attending";
  content: string;
}

export interface MessageReply {
  reply: string;
  revealed: RevealedFinding[];
}

/** The debrief, once the diagnosis is locked in. */
export interface CaseResult {
  correct: boolean;
  reasoning_quality: string;
  headline: string;
  overall: number | null;
  graded?: GradedMetric[];
  metrics: Record<string, number | null>;
  before: number;
  after: number;
  xp_reason: string | null;
  final_diagnosis: string;
  final_reasoning: string;
  correct_diagnosis: string;
  did_well?: string[];
  gaps?: string[];
  note: string | null;
  source?: string;
  duration_sec: number;
}

/** Iris's read on the last few cases. `empty` when there is not enough to say. */
export interface CoachReport {
  empty?: boolean;
  improving?: string | null;
  focus?: string | null;
  roadmap?: string[];
}

export interface HealthReport {
  ok: boolean;
  ai_ready: boolean;
}
