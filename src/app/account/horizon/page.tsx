import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/dashboard/PageHeading";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";

export const metadata: Metadata = buildMetadata({
  title: "Visualise your future",
  description: "Size your catchment and see what your practice could reach.",
  alternates: { canonical: "/account/horizon" },
  robots: { index: false, follow: false },
});

/**
 * The ROI calculator, inside the dashboard.
 *
 * It is a page of its own rather than a fourth section of `/account`. The
 * other three sections are summaries — a few figures and a way on — and they
 * share one scroll because a page load is a poor price for "what else is
 * there". This is not a summary. It is a tool with a specialty, a location, a
 * radius, four volume and fee controls and a live map, and it wants the width
 * and the attention of a whole screen.
 *
 * The `/account` layout wraps it, so the header, the tabs, the logo and the
 * session check all come for free: a doctor opening this from the Growth Lab
 * has not left their own space. Before, the card sent them to `/#roi` — the
 * home page's ROI section — out onto the marketing site to use the tool the
 * dashboard had just advertised.
 *
 * This mounts the same `PracticeGrowthCalculator` the home page and every
 * programme page mount. One component, one set of formulas, one place to change
 * them. It saves against the account by itself, which is what puts the result
 * on the Horizon pane afterwards.
 */
export default function HorizonPage() {
  return (
    <section aria-labelledby="horizon-title" className="dash-section">
      <PageHeading
        level={1}
        id="horizon-title"
        eyebrow="Your horizon"
        title="Visualise your future."
        aside={
          <Link
            href="/account#growth-lab"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to the Growth Lab
          </Link>
        }
      />

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/45">
        Set your catchment and your practice profile, and see the practice your present choices
        are quietly building. Every outlook you run is saved to your account.
      </p>

      <div className="mt-10 lg:mt-12">
        <PracticeGrowthCalculator />
      </div>
    </section>
  );
}
