"use client";

import { useState } from "react";
import { PracticeGrowthCalculator } from "@/components/PracticeGrowthCalculator";
import { ApplyFormModal } from "@/components/ApplyFormModal";

interface Props {
  courseId: string;
  courseName: string;
  courseSlug: string;
  /** Course-taxonomy specialty used as a prefill hint for the calculator. */
  defaultSpecialty?: string;
  mentorName?: string;
  brochureUrl?: string;
}

/**
 * Course-page wrapper around `PracticeGrowthCalculator` that wires the
 * "Know more" CTA to open the brochure-request modal with the course context
 * already filled in. Without this wrapper the calculator falls back to a plain
 * `<a href="#get-started">` link which goes nowhere.
 */
export function CourseRoiBlock({
  courseId,
  courseName,
  courseSlug,
  defaultSpecialty,
  mentorName,
  brochureUrl,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PracticeGrowthCalculator
        defaultSpecialty={defaultSpecialty}
        courseSlug={courseSlug}
        courseName={courseName}
        onCtaClick={() => setOpen(true)}
        ctaLabel="Know more"
      />
      <ApplyFormModal
        open={open}
        onClose={() => setOpen(false)}
        intent="brochure"
        courseId={courseId}
        courseName={courseName}
        mentorName={mentorName}
        brochureUrl={brochureUrl}
      />
    </>
  );
}
