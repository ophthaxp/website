"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

interface SpecialtyInfo {
  label: string;
  factsBlurb: string;
  avgSellingPriceInr: number;
  populationServiceable: number;
  prevalencePct: number;
}

const SPECIALTY_DATA: Record<string, SpecialtyInfo> = {
  cataract: {
    label: "Cataract",
    factsBlurb:
      "Cataract is India's leading cause of blindness — over 9 million affected, with consistent surgical demand year-round.",
    avgSellingPriceInr: 50_000,
    populationServiceable: 1_000_000,
    prevalencePct: 10,
  },
  glaucoma: {
    label: "Glaucoma",
    factsBlurb:
      "Over 11 million Indian adults live with glaucoma, driving sustained demand for diagnostic and surgical care.",
    avgSellingPriceInr: 75_000,
    populationServiceable: 1_000_000,
    prevalencePct: 4,
  },
  retina: {
    label: "Retina",
    factsBlurb:
      "Diabetic retinopathy affects ~30% of diabetics. India's diabetic population is projected to cross 100M by 2030.",
    avgSellingPriceInr: 90_000,
    populationServiceable: 1_000_000,
    prevalencePct: 6,
  },
  "vitreo-retinal": {
    label: "Vitreo-Retinal",
    factsBlurb:
      "Vitreo-retinal cases are highly under-served outside metros — premium pricing power and low competition.",
    avgSellingPriceInr: 110_000,
    populationServiceable: 1_000_000,
    prevalencePct: 5,
  },
  cornea: {
    label: "Cornea",
    factsBlurb:
      "Corneal blindness affects nearly 1.2 million Indians. DALK and DSAEK demand continues to outpace surgeon supply.",
    avgSellingPriceInr: 65_000,
    populationServiceable: 1_000_000,
    prevalencePct: 3,
  },
  refractive: {
    label: "Refractive",
    factsBlurb:
      "Over 250 million Indians need refractive correction. Premium LASIK and SMILE volumes are growing ~18% year-over-year.",
    avgSellingPriceInr: 80_000,
    populationServiceable: 1_000_000,
    prevalencePct: 25,
  },
  pediatric: {
    label: "Pediatric Ophthalmology",
    factsBlurb:
      "Childhood blindness affects ~280,000 Indian children. Pediatric refractive and strabismus services are scarce.",
    avgSellingPriceInr: 35_000,
    populationServiceable: 1_000_000,
    prevalencePct: 2,
  },
  uveitis: {
    label: "Uveitis",
    factsBlurb:
      "Uveitis causes ~10% of blindness in working-age adults. Sub-specialty access remains limited across Tier-2 cities.",
    avgSellingPriceInr: 45_000,
    populationServiceable: 1_000_000,
    prevalencePct: 1.5,
  },
  neuro: {
    label: "Neuro-Ophthalmology",
    factsBlurb:
      "Less than 0.5% of practicing Indian ophthalmologists sub-specialize in neuro-ophthalmology — premium consult demand.",
    avgSellingPriceInr: 4_000,
    populationServiceable: 1_000_000,
    prevalencePct: 1,
  },
};

function formatINRShort(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

interface Props {
  defaultSpecialty?: string;
  courseTuitionInr?: number;
  ctaHref?: string;
}

export function PracticeGrowthCalculator({
  defaultSpecialty = "cataract",
  courseTuitionInr = 350_000,
  ctaHref = "#get-started",
}: Props) {
  const initialKey =
    defaultSpecialty && defaultSpecialty in SPECIALTY_DATA
      ? defaultSpecialty
      : "cataract";
  const [specialty, setSpecialty] = useState<string>(initialKey);
  const [patients, setPatients] = useState<number>(60);

  const data = SPECIALTY_DATA[specialty] ?? SPECIALTY_DATA.cataract;

  const { lowerBound, upperBound, roiMultiplier, impactPct } = useMemo(() => {
    const projectedRevenue = patients * data.avgSellingPriceInr;
    // 2-year horizon, with a ±10% spread for the displayed range.
    const twoYear = projectedRevenue * 2;
    const lower = twoYear * 0.9;
    const upper = twoYear * 1.1;
    const roi = courseTuitionInr > 0 ? twoYear / courseTuitionInr : 0;
    const prevalenceCount = (data.populationServiceable * data.prevalencePct) / 100;
    const impact = prevalenceCount > 0 ? (patients / prevalenceCount) * 100 : 0;
    return {
      lowerBound: lower,
      upperBound: upper,
      roiMultiplier: roi,
      impactPct: impact,
    };
  }, [patients, data, courseTuitionInr]);

  return (
    <section
      aria-labelledby="growth-title"
      className="mt-16 overflow-hidden rounded-2xl bg-ink-850 p-6 ring-1 ring-white/5 sm:p-10"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* ─────────── LEFT: Inputs ─────────── */}
        <div>
          <h2
            id="growth-title"
            className="font-serif text-3xl leading-tight text-white sm:text-4xl"
          >
            Estimate Your{" "}
            <span className="text-accent-soft">Practice Growth</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Select your specialty and see how your investment in advanced
            learning can translate into higher earnings.
          </p>

          {/* Specialty dropdown */}
          <label
            htmlFor="growth-specialty"
            className="mt-8 block text-sm font-semibold text-white"
          >
            Select your specialization
          </label>
          <div className="relative mt-2">
            <select
              id="growth-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-lg bg-ink-700 px-4 py-3 pr-10 text-sm font-medium text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {Object.entries(SPECIALTY_DATA).map(([k, v]) => (
                <option key={k} value={k} className="bg-ink-800">
                  {v.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
            />
          </div>

          {/* Specialty fact card */}
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
            <p className="text-sm leading-relaxed text-white/90">
              {data.factsBlurb}
            </p>
          </div>

          {/* Patient slider */}
          <div className="mt-8 flex items-end justify-between">
            <label
              htmlFor="growth-patients"
              className="text-sm font-semibold text-white"
            >
              How many patients do you expect to treat this year?
            </label>
            <span className="ml-3 shrink-0 text-base font-bold tabular-nums text-white">
              {patients}
            </span>
          </div>
          <input
            id="growth-patients"
            type="range"
            min={10}
            max={200}
            step={5}
            value={patients}
            onChange={(e) => setPatients(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-white/55">
            <span>10 patients</span>
            <span>200 patients</span>
          </div>

          <p className="mt-3 text-xs text-white/45">
            Reaching <span className="font-semibold text-white/80">{impactPct.toFixed(2)}%</span>{" "}
            of the prevalent {data.label.toLowerCase()} population in your service area.
          </p>
        </div>

        {/* ─────────── RIGHT: Outputs ─────────── */}
        <div className="rounded-xl border border-accent/40 bg-ink-950/60 p-6 sm:p-8">
          <p className="text-center text-sm font-semibold text-white">
            Your Estimated Additional Income
          </p>
          <p className="mt-4 text-center font-serif text-4xl leading-none text-white sm:text-5xl">
            {formatINRShort(lowerBound)}{" "}
            <span className="text-white/50">–</span>{" "}
            {formatINRShort(upperBound)}
          </p>
          <p className="mt-2 text-center text-sm text-white/55">over 2 years</p>

          <div className="mt-6 rounded-lg border border-accent/40 px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-wider text-white/55">
              Estimated ROI within 2 years
            </p>
            <p className="mt-1.5 text-2xl font-bold text-accent-soft">
              {roiMultiplier > 0 ? `${roiMultiplier.toFixed(1)}x` : "—"}
            </p>
          </div>

          <p className="mt-6 text-center text-sm font-semibold text-white">
            Ready to reimagine your practice?
          </p>
          <div className="mt-3 flex justify-center">
            <a
              href={ctaHref}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
            >
              Join the waitlist
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
