import { Crosshair, MessageCircle, ScanSearch, Share2 } from "lucide-react";

/**
 * The four things a doctor is doing here, in the order they happen.
 *
 * They are declared once because they are drawn three times — as the numbered
 * rail on Your Space, as the cards in the Growth Lab, and as the entry to
 * Pathways — and three copies of a label is three chances for them to drift.
 *
 * `href` is only read by the Growth Lab cards — on Your Space these are panes
 * switched in place, not places to navigate to.
 */
export interface ThreadItem {
  key: string;
  /** The quiet line above the name — what the tool is *for*, not what it is. */
  eyebrow: string;
  name: string;
  /** Set only where the tool is somebody else's work, e.g. "by LoMa". */
  attribution?: string;
  /** One sentence, used on the Growth Lab card. */
  blurb: string;
  /** The state line: what this doctor has done here so far. */
  status: string;
  href: string;
  icon: typeof Crosshair;
  /** Nothing to open yet — rendered as present but plainly not ready. */
  comingSoon?: boolean;
}

export const THREAD: ThreadItem[] = [
  {
    key: "horizon",
    eyebrow: "Your horizon",
    name: "Visualise your future",
    blurb: "See the practice your present choices are quietly building.",
    status: "Size your catchment",
    // The calculator itself is on Your Space now, so this points at the pane
    // rather than sending a signed-in doctor back out to the marketing page.
    href: "#horizon",
    icon: Crosshair,
  },
  {
    key: "loma",
    eyebrow: "Your thinking partner",
    name: "LoMa",
    blurb: "Ask a medical question. Let context decide what is useful next.",
    status: "Coming soon",
    href: "/#smart-assist",
    icon: MessageCircle,
    comingSoon: true,
  },
  {
    key: "caseroom",
    eyebrow: "Your judgement takes shape",
    name: "Caseroom",
    attribution: "by LoMa",
    blurb: "The next case changes as your clinical reasoning does.",
    status: "Coming soon",
    href: "/#smart-assist",
    icon: ScanSearch,
    comingSoon: true,
  },
  {
    key: "pathways",
    eyebrow: "Your path to mastery",
    name: "Pathways",
    blurb: "Find the programme that belongs in your next chapter.",
    status: "Ready to map",
    href: "#pathways",
    icon: Share2,
  },
];

/** Two-digit index, as the rail numbers them: 01, 02, 03, 04. */
export function threadNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}
