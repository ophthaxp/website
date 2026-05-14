"use client";

import { useState } from "react";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { ApplyFormModal } from "@/components/ApplyFormModal";

export function HomeRoiSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="roi-title"
      className="mx-auto max-w-7xl px-5 pb-8 sm:px-8"
    >
      <div className="mb-8 text-center">
        <h2
          id="roi-title"
          className="font-serif text-3xl leading-tight text-white sm:text-4xl"
        >
          See Your <span className="text-accent-soft">Return on Investment</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
          Pick your specialty and patient volume to project the additional
          income an OphthaXP mentorship can unlock for your practice.
        </p>
      </div>

      <PracticeGrowthCalculator onCtaClick={() => setOpen(true)} />

      <ApplyFormModal
        open={open}
        onClose={() => setOpen(false)}
        intent="brochure"
        courseId="homepage-roi"
      />
    </section>
  );
}
