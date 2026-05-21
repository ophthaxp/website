"use client";

import { useState } from "react";
import { ApplyFormModal } from "@/components/ApplyFormModal";

export function CourseApplyButton({
  courseId,
  courseName,
  mentorName,
  payUrl,
  label = "Apply Now",
  variant = "primary",
  block = false,
  brochureUrl,
}: {
  courseId: string;
  courseName?: string;
  mentorName?: string;
  payUrl?: string;
  label?: string;
  variant?: "primary" | "outline";
  /** When true, the button stretches to fill its container (full-width CTA card). */
  block?: boolean;
  brochureUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  const widthCls = block ? "w-full" : "";
  const cls =
    variant === "primary"
      ? `${widthCls} rounded-full bg-[#ab834d] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#ab834d]/30 transition hover:bg-[#8a6a40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d] focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950`
      : `${widthCls} rounded-full border border-[#ab834d]/50 bg-[#ab834d]/10 px-8 py-3 text-sm font-semibold text-[#ab834d] transition hover:bg-[#ab834d] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d] focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950`;

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
