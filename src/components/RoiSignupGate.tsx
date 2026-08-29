"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogIn, UserPlus } from "lucide-react";

/**
 * The wall that comes down over the ROI results once a visitor has used their
 * free allowance.
 *
 * It sits over the panel rather than replacing it, so what they have already
 * seen stays visible behind the blur. Somebody who has read two real answers
 * and is being asked for the third understands the trade; somebody staring at
 * an empty box does not.
 *
 * The server decides when this appears — everything here is presentation.
 */

export interface RoiQuota {
  pincodesUsed: number;
  controlChangesUsed: number;
  freePincodes: number;
  freeControlChanges: number;
}

export function RoiSignupGate({
  reason,
  quota,
}: {
  reason: "pincodes" | "controlChanges" | null;
  quota: RoiQuota | null;
}) {
  const pathname = usePathname() || "/";
  // Come back to the calculator, not the top of the page, once they are in.
  const next = encodeURIComponent(`${pathname}#roi`);

  const isControls = reason === "controlChanges";

  const heading = isControls
    ? "Keep refining your outlook"
    : "Visualize your practice anywhere";

  /**
   * Only name a number when this visitor really reached it.
   *
   * The wall can also come down because the shared-network backstop ran out —
   * several people on one hospital connection between them — and in that case
   * this visitor has used fewer than the limit. Telling them they explored two
   * locations when they explored one is the kind of small lie that makes
   * somebody distrust the numbers above it, so the copy stays general.
   */
  const reachedOwnLimit = isControls
    ? quota !== null && quota.controlChangesUsed >= quota.freeControlChanges
    : quota !== null && quota.pincodesUsed >= quota.freePincodes;

  /** What they have used. Stated plainly, without reproach. */
  const used = isControls
    ? quota && reachedOwnLimit
      ? `You have refined this outlook ${quota.freeControlChanges} times.`
      : "You have reached the free limit for refining this outlook."
    : quota && reachedOwnLimit
      ? `You have explored your ${quota.freePincodes} free ${
          quota.freePincodes === 1 ? "location" : "locations"
        }.`
      : "You have reached the free limit for exploring locations.";

  /**
   * What an account opens up, in the panel's own terms. Deliberately does NOT
   * begin "create a free account" — the button directly below already says
   * that, and hearing it twice in three lines reads as a pitch.
   */
  const offer = isControls
    ? "An account lets you keep adjusting your volumes, fees and catchment."
    : "An account opens up every pincode in India.";

  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center p-5">
      {/* The blur is what makes this read as "there is more here" rather than
          "this failed to load". pointer-events on the backdrop stop anyone
          clicking the controls underneath it. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-ink-800/70 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="roi-gate-heading"
        className="relative w-full max-w-sm rounded-2xl bg-[#0f0f12] p-6 text-center ring-1 ring-white/10"
      >
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
          <Lock className="h-5 w-5 text-accent" aria-hidden />
        </span>

        <h3
          id="roi-gate-heading"
          className="mt-3.5 text-[17px] font-semibold text-white"
        >
          {heading}
        </h3>

        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          {used}{" "}
          <span className="text-white/75">{offer}</span>
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            href={`/signup?next=${next}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white transition hover:bg-accent-deep"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Create a free account
          </Link>

          <Link
            href={`/login?next=${next}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium text-white/70 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-white"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            I already have an account
          </Link>
        </div>

        <p className="mt-4 text-[11px] text-white/35">
          Free. No card needed.
        </p>
      </div>
    </div>
  );
}
