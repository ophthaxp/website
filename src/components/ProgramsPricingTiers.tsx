"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { ApplyFormModal } from "@/components/ApplyFormModal";

type TierKey = "bronze" | "silver" | "gold";

interface Tier {
  key: TierKey;
  name: string;
  tagline: string;
  priceInr: number;
  perLabel: string;
  perDayInr?: number;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

// Default tier prices used when the page doesn't pass a course-specific
// `basePriceInr`. Silver is the anchor; Bronze/Gold are derived in
// `buildTiers` below using the same multipliers as the per-course case.
const DEFAULT_SILVER_INR = 1_25_000;

function buildTiers(basePriceInr?: number): Tier[] {
  const silver = basePriceInr && basePriceInr > 0 ? basePriceInr : DEFAULT_SILVER_INR;
  const bronze = Math.round((silver * 0.4) / 1000) * 1000;
  const gold = Math.round((silver * 2) / 1000) * 1000;
  const perDay = (n: number) => Math.max(1, Math.round(n / 365));

  return [
    {
      key: "bronze",
      name: "Bronze",
      tagline: "Self-paced foundation",
      priceInr: bronze,
      perLabel: "one-time",
      perDayInr: perDay(bronze),
      features: [
        "Lifetime access to recorded lectures",
        "Downloadable course PDFs & references",
        "Verified certificate of completion",
        "Community Q&A access",
        "Email-only concierge support",
      ],
      ctaLabel: "Get Bronze",
    },
    {
      key: "silver",
      name: "Silver",
      tagline: "Live cohort experience",
      priceInr: silver,
      perLabel: "per cohort",
      perDayInr: perDay(silver),
      features: [
        "Everything in Bronze",
        "Live cohort sessions with faculty",
        "Weekly live Q&A and case clinics",
        "Hands-on assignments with feedback",
        "Priority concierge support",
        "Cohort certificate signed by faculty",
      ],
      ctaLabel: "Get Silver",
      highlighted: true,
    },
    {
      key: "gold",
      name: "Gold",
      tagline: "1:1 mentorship + practice growth",
      priceInr: gold,
      perLabel: "per cohort",
      perDayInr: perDay(gold),
      features: [
        "Everything in Silver",
        "1:1 mentor sessions (6 per cohort)",
        "Personalised learning roadmap",
        "Live OT observation invites",
        "Practice-growth & ROI consults",
        "Lifetime alumni network access",
        "30-day money-back guarantee",
      ],
      ctaLabel: "Get Gold",
    },
  ];
}

function formatINRShort(n: number): string {
  if (n >= 1_00_000) {
    const lakhs = n / 1_00_000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

interface PricingProps {
  /** Course-specific base price (₹). When supplied, Bronze/Silver/Gold are
   *  derived from this anchor so the tiers reflect the actual course fee. */
  basePriceInr?: number;
  /** Course name used in the heading and forwarded to the apply modal so the
   *  submission identifies which course's tier was clicked. */
  courseName?: string;
  /** Stable id used for the apply modal payload. Falls back to "tier" when
   *  the section is mounted at the catalog level. */
  courseId?: string;
}

export function ProgramsPricingTiers({
  basePriceInr,
  courseName,
  courseId,
}: PricingProps = {}) {
  const [openTier, setOpenTier] = useState<Tier | null>(null);
  const tiers = buildTiers(basePriceInr);

  const heading = courseName
    ? `Choose your ${courseName} plan`
    : "Choose the path that fits your practice";
  const subheading = courseName
    ? "Three ways to take this program — pick the level of mentorship that matches where you are in your practice."
    : "Every plan works across our mentorship catalog. Start with self-paced fundamentals or go straight to 1:1 surgical mentorship — switch any time within your cohort.";

  return (
    <section
      aria-labelledby="pricing-title"
      className="mt-12 sm:mt-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ab834d]">
          Plans &amp; Pricing
        </p>
        <h2
          id="pricing-title"
          className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl"
        >
          {heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
          {subheading}
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        {tiers.map((tier) => {
          const isGold = tier.key === "gold";
          const isHL = !!tier.highlighted;
          return (
            <div
              key={tier.key}
              className={`relative flex flex-col rounded-2xl border p-6 transition sm:p-7 ${
                isHL
                  ? "border-[#ab834d] bg-gradient-to-b from-[#ab834d]/15 via-ink-900 to-ink-950 shadow-[0_24px_60px_-30px_rgba(171,131,77,0.55)] lg:scale-[1.02]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              {isHL && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#ab834d] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                  <Sparkles className="h-3 w-3" aria-hidden /> Most popular
                </span>
              )}

              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
                    isHL ? "text-[#d6a76b]" : "text-white/55"
                  }`}
                >
                  {tier.name}
                </p>
                <p className="mt-2 font-serif text-2xl leading-tight text-white">
                  {tier.tagline}
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-4xl text-white sm:text-5xl">
                  {formatINRShort(tier.priceInr)}
                </span>
                <span className="text-xs uppercase tracking-wider text-white/55">
                  {tier.perLabel}
                </span>
              </div>
              {tier.perDayInr ? (
                <p className="mt-1 text-xs text-white/45">
                  ≈ ₹{tier.perDayInr.toLocaleString("en-IN")} / day across a 12-month cohort
                </p>
              ) : null}

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isHL || isGold ? "bg-[#ab834d]/25 text-[#d6a76b]" : "bg-white/10 text-white/70"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setOpenTier(tier)}
                className={`mt-7 w-full rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d] focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                  isHL
                    ? "bg-[#ab834d] text-white shadow-lg shadow-[#ab834d]/30 hover:bg-[#8a6a40]"
                    : "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {tier.ctaLabel}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-white/45">
        All prices in INR · GST extra · EMI available at checkout
      </p>

      {/* Single shared modal — captures which tier was clicked via courseName. */}
      <ApplyFormModal
        open={!!openTier}
        onClose={() => setOpenTier(null)}
        intent="apply"
        courseId={
          openTier
            ? courseId
              ? `${courseId}-${openTier.key}`
              : `tier-${openTier.key}`
            : "tier"
        }
        courseName={
          openTier
            ? courseName
              ? `${courseName} — ${openTier.name} plan`
              : `${openTier.name} plan — ${openTier.tagline}`
            : undefined
        }
      />
    </section>
  );
}
