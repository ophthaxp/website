"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Sparkle, X } from "lucide-react";
import { HERO_VIDEO_POSTER } from "@/lib/data";

const TRAILER_SRC = "/Screen%20Recording%202026-05-09%20132251.mp4";

export function LegendsVideo() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    videoRef.current?.play().catch(() => {});
    return () => document.removeEventListener("keydown", onKey);
  }, [playing]);

  const close = () => {
    videoRef.current?.pause();
    setPlaying(false);
    triggerRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="legends-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="legends-title"
        className="mx-auto max-w-3xl text-center text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-[1.3] tracking-[-0.01em] text-white"
      >
        Experience world-class mentorship
        <br className="hidden sm:block" /> from the finest minds in medicine.
      </h2>

      <div className="relative mt-10 aspect-[16/10] w-full overflow-hidden rounded-[20px] bg-ink-850 sm:mt-14 sm:aspect-[1200/648]">
        {playing ? (
          <>
            <video
              ref={videoRef}
              src={TRAILER_SRC}
              controls
              playsInline
              autoPlay
              className="h-full w-full bg-black object-contain"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close trailer"
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur transition hover:border-accent hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_VIDEO_POSTER}
              alt="Senior ophthalmology consultant introducing the Legends of Medicine mentorship cohorts"
              className="h-full w-full object-cover"
            />

            {/* Scrim — heaviest on the right so the overlay copy stays legible. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(0,0,0,0.97)_0%,rgba(0,0,0,0.9)_20%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.12)_75%,rgba(0,0,0,0)_92%)]"
            />

            <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black sm:right-8 sm:top-8">
              <Sparkle className="h-3.5 w-3.5 fill-black" aria-hidden />
              New Trailer
            </span>

            <div className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col items-center justify-center px-6 text-center sm:px-10">
              <h3 className="font-serif text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-[1.25] text-white">
                Mastering Modern Corneal Surgery
              </h3>
              <span className="mt-5 block h-px w-6 bg-white/70" aria-hidden />
              <p className="mt-5 text-sm text-white/70">
                with <span className="font-semibold text-white">Dr. K. Srinivas Roa</span>
              </p>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setPlaying(true)}
                className="mt-6 inline-flex items-center gap-2.5 rounded-[10px] border border-white/25 bg-black/40 px-6 py-3 text-[15px] font-medium text-white backdrop-blur-sm transition hover:border-accent hover:bg-accent"
              >
                <Play className="h-4 w-4" aria-hidden />
                Watch Trailer
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
