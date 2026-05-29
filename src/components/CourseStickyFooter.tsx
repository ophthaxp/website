"use client";

import { useEffect, useState } from "react";
import { ApplyFormModal } from "@/components/ApplyFormModal";

interface Props {
  courseId: string;
  courseName: string;
  /** Used as the bold left-side title (e.g. "Senior Vitreo-Retinal Surgeon"). */
  facultyTitle?: string;
  /** Subtitle line under the title (e.g. "Dr. Arun Mehta"). */
  facultyName?: string;
  facultyImageUrl?: string;
  brochureUrl?: string;
  payUrl?: string;
}

/**
 * Persistent footer bar shown on the course detail page. Slides in after the
 * user scrolls past the hero so it doesn't fight the primary CTA, and exposes
 * the two key actions (brochure + apply) from anywhere on the page.
 */
export function CourseStickyFooter({
  courseId,
  courseName,
  facultyTitle,
  facultyName,
  facultyImageUrl,
  brochureUrl,
  payUrl,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [brochureOpen, setBrochureOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  // Reveal the bar once the user scrolls a screen down so it doesn't overlap
  // the hero CTAs. Hidden again near the bottom so it doesn't double up with
  // the final "Ready to shift…" CTA banner.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const nearBottom = max > 0 && y > max - 240;
      setVisible(y > window.innerHeight * 0.6 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div
        role="region"
        aria-label="Course actions"
        aria-hidden={!visible}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 backdrop-blur-md transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-16">
          {/* Left: faculty identity */}
          <div className="flex min-w-0 items-center gap-3">
            {facultyImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={facultyImageUrl}
                alt={facultyName || courseName}
                className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover sm:h-11 sm:w-11"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-full bg-accent/20 sm:h-11 sm:w-11" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white sm:text-[15px]">
                {facultyTitle || courseName}
              </p>
              {facultyName ? (
                <p className="truncate text-xs text-white/60 sm:text-sm">
                  {facultyName}
                </p>
              ) : null}
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setBrochureOpen(true)}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Know More
            </button>
            <button
              type="button"
              onClick={() => setApplyOpen(true)}
              className="rounded-full bg-[#ab834d] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#ab834d]/30 transition hover:bg-[#8a6a40] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>

      <ApplyFormModal
        open={brochureOpen}
        onClose={() => setBrochureOpen(false)}
        intent="brochure"
        courseId={courseId}
        courseName={courseName}
        mentorName={facultyName}
        brochureUrl={brochureUrl}
      />
      <ApplyFormModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        intent="apply"
        courseId={courseId}
        courseName={courseName}
        mentorName={facultyName}
        brochureUrl={brochureUrl}
        payUrl={payUrl}
      />
    </>
  );
}
