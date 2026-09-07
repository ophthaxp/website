"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApplyFormModal } from "@/components/ApplyFormModal";

interface Props {
  courseId: string;
  courseName: string;
  /**
   * The course's URL slug. Given one, Apply Now goes to `/apply/[slug]` —
   * the same place every other Apply on the page goes. Without it the bar
   * falls back to the popup, which is all it could do before and is still
   * right for a caller that has no page to send anybody to.
   */
  courseSlug?: string;
  /** Used as the bold left-side title (e.g. "Senior Vitreo-Retinal Surgeon"). */
  facultyTitle?: string;
  /** Subtitle line under the title (e.g. "Dr. Arun Mehta"). */
  facultyName?: string;
  facultyImageUrl?: string;
  brochureUrl?: string;
}

/** The accent pill, shared by the link and the fallback button. */
const APPLY_CLS =
  "rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-deep sm:px-5 sm:py-2.5 sm:text-sm";

/**
 * Persistent footer bar shown on the course detail page. Slides in after the
 * user scrolls past the hero so it doesn't fight the primary CTA, and exposes
 * the two key actions (brochure + apply) from anywhere on the page.
 */
export function CourseStickyFooter({
  courseId,
  courseName,
  courseSlug,
  facultyTitle,
  facultyName,
  facultyImageUrl,
  brochureUrl,
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
                onError={(e) => {
                  // If the URL 404s, hide the broken image so the initials fallback shows.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-accent/40 to-accent-deep/60 text-[12px] font-semibold uppercase tracking-wider text-white/85 sm:h-11 sm:w-11 sm:text-[13px]"
              >
                {(facultyName || courseName || "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
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

          {/* Right: CTAs.

              Know More stays a popup: asking for a brochure is a name and an
              email, and sending somebody to a different page for that would
              lose their place on this one. Apply is the other kind of thing —
              a journey with steps, a booking and a payment in it — so it goes
              where the two Apply buttons in the page body already go. Two
              routes into one application was the bug: they resume differently,
              they say different things to somebody who has already applied,
              and which you got depended on whether you scrolled. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setBrochureOpen(true)}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Know More
            </button>
            {courseSlug ? (
              <Link href={`/apply/${courseSlug}`} className={APPLY_CLS}>
                Apply Now
              </Link>
            ) : (
              <button type="button" onClick={() => setApplyOpen(true)} className={APPLY_CLS}>
                Apply Now
              </button>
            )}
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
      {/* Only mounted where there is no journey page to link to. */}
      {courseSlug ? null : (
        <ApplyFormModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          intent="apply"
          courseId={courseId}
          courseName={courseName}
          mentorName={facultyName}
          brochureUrl={brochureUrl}
        />
      )}
    </>
  );
}
