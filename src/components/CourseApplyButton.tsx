"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ApplyFormModal } from "@/components/ApplyFormModal";
import { useApplyAutoOpen } from "@/components/useApplyAutoOpen";

export function CourseApplyButton({
  courseId,
  courseSlug,
  courseName,
  mentorName,
  payUrl,
  label = "Apply Now",
  variant = "primary",
  block = false,
  brochureUrl,
}: {
  courseId: string;
  /**
   * The course's URL slug. When given, Apply Now navigates to `/apply/[slug]`
   * — the ten-step journey does not fit in a popup. Without it the button falls
   * back to the old modal, so call sites that have no slug keep working.
   */
  courseSlug?: string;
  courseName?: string;
  mentorName?: string;
  payUrl?: string;
  label?: string;
  /**
   * `primary`/`outline` are the legacy gold pills. `accent`/`accent-outline`
   * are the course-page pair from the Figma: a 12px-radius terracotta slab and
   * the dark slab beside it.
   */
  variant?: "primary" | "outline" | "accent" | "accent-outline";
  /** When true, the button stretches to fill its container (full-width CTA card). */
  block?: boolean;
  brochureUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  // Someone arriving from a sign-in link lands here with ?apply=1.
  useApplyAutoOpen(useCallback(() => setOpen(true), []));

  const widthCls = block ? "w-full" : "";
  const focusCls =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";
  const VARIANTS: Record<string, string> = {
    primary: `rounded-full bg-[#ab834d] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ab834d]/30 transition hover:bg-[#8a6a40] focus-visible:ring-[#ab834d]`,
    outline: `rounded-full border border-[#ab834d]/50 bg-[#ab834d]/10 px-8 py-3 text-sm font-semibold text-[#ab834d] transition hover:bg-[#ab834d] hover:text-white focus-visible:ring-[#ab834d]`,
    accent: `rounded-[12px] border-[1.5px] border-accent bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:border-accent-deep hover:bg-accent-deep focus-visible:ring-accent`,
    "accent-outline": `rounded-[12px] border-[1.5px] border-[#4A4A4A] bg-[#1A1A1A] px-7 py-3 text-sm font-medium text-[#A0A0A0] transition hover:border-white/25 hover:text-white focus-visible:ring-white/40`,
  };
  const cls = `${widthCls} ${VARIANTS[variant] ?? VARIANTS.primary} ${focusCls}`;

  // The journey has its own page when we know where to send them.
  if (courseSlug) {
    return (
      <Link href={`/apply/${courseSlug}`} className={cls}>
        {label}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        {label}
      </button>
      <ApplyFormModal
        open={open}
        onClose={() => setOpen(false)}
        intent="apply"
        courseId={courseId}
        courseName={courseName}
        mentorName={mentorName}
        payUrl={payUrl}
        brochureUrl={brochureUrl}
      />
    </>
  );
}
