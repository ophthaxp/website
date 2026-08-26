"use client";

import Link from "next/link";
import { useState } from "react";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { ApplyFormModal } from "@/components/ApplyFormModal";

export function HomeRoiSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      id="roi"
      aria-labelledby="roi-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="roi-title"
        className="text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        Visualize your future practice
      </h2>
      <p className="mt-3 text-[15px] text-white/40">
        Estimate your fellowship&apos;s real-world clinical impact.
      </p>

      <div className="mt-10 sm:mt-12">
        <PracticeGrowthCalculator defaultPincode="560102" defaultRadiusKm={25} />
      </div>

      {/* Closing CTA */}
      <div className="mt-20 text-center sm:mt-28">
        <h3 className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-tight tracking-[-0.015em] text-white">
          Ready to redefine your clinical future?
        </h3>
        <p className="mx-auto mt-4 max-w-[42rem] text-[15px] leading-relaxed text-white/45">
          Take the next step with a Program designed to elevate your expertise, expand
          your impact, and shape the future of your practice.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-[10px] bg-accent px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Speak To Concierge
          </button>
          <Link
            href="/programs"
            className="rounded-[10px] bg-ink-850 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Explore Programs
          </Link>
        </div>
      </div>

      <ApplyFormModal
        open={open}
        onClose={() => setOpen(false)}
        intent="brochure"
        courseId="homepage-roi"
      />
    </section>
  );
}
