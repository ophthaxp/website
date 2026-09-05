/**
 * Turning an application's state into something a doctor can read.
 *
 * A draft is described by which step it stopped on. Everything after
 * submission is described by the lead's status, because that is what the team
 * actually moves along — the booking fee, the Legend's decision, the course fee.
 * The values mirror `LEAD_STATUS` in the platform's `enrollment.service.ts`.
 */

export type LeadStatus =
  | "new"
  | "call_fee_paid"
  | "selected"
  | "not_selected"
  | "course_fee_paid"
  | "enrolled";

export interface Stage {
  key: string;
  label: string;
  /**
   * The label when the stages are laid out side by side and each one only gets
   * a sliver of the card's width. Says the same thing in as few words as it can.
   */
  short: string;
  /** What the applicant should understand has happened, or is expected of them. */
  detail: string;
}

/**
 * The path an application walks, in order.
 *
 * `not_selected` is deliberately absent: it is an outcome of the decision
 * stage, not a stage of its own, and is handled separately below.
 */
export const STAGES: Stage[] = [
  {
    key: "new",
    label: "Application received",
    short: "Received",
    detail: "Our team is reviewing your application.",
  },
  {
    key: "call_fee_paid",
    label: "Slot booked",
    short: "Slot booked",
    detail: "Your session with your Legend is confirmed.",
  },
  {
    key: "selected",
    label: "Legend's decision",
    short: "Decision",
    detail: "Your Legend has reviewed your case after the session.",
  },
  {
    key: "course_fee_paid",
    label: "Seat confirmed",
    short: "Seat held",
    detail: "Your course fee is paid and your seat is held.",
  },
  {
    key: "enrolled",
    label: "Enrolled",
    short: "Enrolled",
    detail: "You're in. Your LMS details are on their way.",
  },
];

/** How far along a status sits. Mirrors LEAD_STATUS_RANK on the platform. */
const RANK: Record<string, number> = {
  new: 0,
  call_fee_paid: 1,
  // A decision either way is the same stage of the funnel.
  selected: 2,
  not_selected: 2,
  course_fee_paid: 3,
  enrolled: 4,
};

export function stageRank(status: string | null | undefined): number {
  return RANK[String(status ?? "").trim()] ?? 0;
}

/**
 * How far the applicant's own progress has carried them.
 *
 * The ladder is really the business's view — it moves when a payment lands or
 * a Legend decides. But the Star does the first part of it themselves, and
 * until the payment webhook exists nothing would ever move the lead off `new`,
 * so the ladder would sit at step one however far they had actually got.
 *
 * A slot only counts as booked once it is paid for, which in the flow is the
 * end of checkout — `STEP.done`. Choosing a time without paying is not yet a
 * booking, so step 4 deliberately does not raise it.
 */
export function stageRankFromStep(currentStep: number | null | undefined): number {
  return Number(currentStep) >= 5 ? RANK.call_fee_paid : 0;
}

/** The further along of the two views. */
export function combinedStageRank(
  leadStatus: string | null | undefined,
  currentStep: number | null | undefined,
): number {
  return Math.max(stageRank(leadStatus), stageRankFromStep(currentStep));
}

export function isRejected(status: string | null | undefined): boolean {
  return String(status ?? "").trim() === "not_selected";
}

export interface Headline {
  title: string;
  body: string;
  tone: "draft" | "progress" | "done" | "closed";
}

/** The one-line summary at the top of an application card. */
export function headlineFor(input: {
  applicationStatus?: string;
  currentStep?: number;
  leadStatus?: string | null;
}): Headline {
  if (input.applicationStatus !== "submitted") {
    const step = Number(input.currentStep) >= 2 ? 2 : 1;
    return {
      tone: "draft",
      title: step === 2 ? "Almost there" : "Not finished yet",
      body:
        step === 2
          ? "Your details are saved. One step left before we can send it."
          : "We've saved what you entered. Pick up where you left off whenever you like.",
    };
  }

  // Submitted, but the applicant still has steps of their own: booking the
  // call, confirming it, paying. Their next action beats the lead's status,
  // because the lead cannot move until they take it.
  const step = Number(input.currentStep) || 0;
  if (step === 3) {
    return {
      tone: "progress",
      title: "Pick a time with your Legend",
      body: "Your application is in. Choose a slot from your Legend's availability.",
    };
  }
  if (step === 4) {
    return {
      tone: "progress",
      title: "Confirm and pay",
      body: "One step left — confirm your slot and pay to lock it in.",
    };
  }

  const status = String(input.leadStatus ?? "new").trim();

  if (Number(input.currentStep) >= 5 && status === "new") {
    return {
      tone: "progress",
      title: "Slot booked",
      body: "Your session is confirmed. We'll be in touch with the details.",
    };
  }

  if (status === "enrolled") {
    return {
      tone: "done",
      title: "You're enrolled",
      body: "Your place is confirmed. Check your email for your LMS account details.",
    };
  }
  if (isRejected(status)) {
    return {
      tone: "closed",
      title: "Not taken forward this time",
      body: "Your Legend felt this cohort wasn't the right fit. Our team can suggest alternatives.",
    };
  }

  const stage = STAGES[stageRank(status)] ?? STAGES[0];
  return {
    tone: "progress",
    title: stage.label,
    body: stage.detail,
  };
}
