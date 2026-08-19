"use client";

import { useState } from "react";
import { WaitlistModal } from "@/components/WaitlistModal";

export function JoinWaitlistButton({
  label = "Join Waitlist",
  source = "hero-waitlist",
  className,
}: {
  label?: string;
  source?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#ab834d]/50 bg-[#ab834d]/10 px-7 py-2.5 text-sm font-semibold text-[#e3c893] transition hover:bg-[#ab834d] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab834d] focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        }
      >
        {label}
      </button>
      <WaitlistModal open={open} onClose={() => setOpen(false)} source={source} />
    </>
  );
}
