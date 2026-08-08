"use client";

import { useState } from "react";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { ApplyFormModal } from "@/components/ApplyFormModal";

export function HomeRoiSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="roi-title"
      className="mx-auto max-w-[1500px] px-6 pb-8 sm:px-16 lg:px-24"
    >
      <div className="mb-8 text-center">
        <h2
          id="roi-title"
          className="font-serif text-3xl leading-tight text-white sm:text-4xl"
        >
          Model your future <span className="text-accent-soft">Practice</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
         Visualise how mastery in a specialty can reshape the scale and influence of your practice.
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
