"use client";

import { useState } from "react";
import { ApplyFormModal } from "@/components/ApplyFormModal";

export function CourseApplyButton({
  courseId,
  courseName,
  mentorName,
  payUrl,
  label = "Join the waitlist",
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
      ? `${widthCls} rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent/90`
      : `${widthCls} rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10`;

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
