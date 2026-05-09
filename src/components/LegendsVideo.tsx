import Link from "next/link";
import { Play } from "lucide-react";
import { HERO_VIDEO_POSTER } from "@/lib/data";

export function LegendsVideo() {
  return (
    <section
      aria-labelledby="legends-title"
      className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24"
    >
      <h2
        id="legends-title"
        className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight text-white sm:text-5xl"
      >
        Meet the world&rsquo;s best. <br className="hidden sm:block" />
        New classes added every month.
      </h2>

      <div className="relative mx-auto mt-10 aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-ink-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_VIDEO_POSTER}
          alt="Senior ophthalmology consultant introducing the OphthaXP mentorship cohorts"
          className="h-full w-full object-cover"
        />

        {/* Gradient scrim — darker on the right so the overlay card stays legible */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_left,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.85)_25%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0)_85%)]" />

        {/* Featured-class overlay card */}
        <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col items-center justify-center px-6 text-center sm:px-10">
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
            New
          </span>
          <h3 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-5xl">
            The Technique of <br />
            Phacoemulsification
          </h3>
          <span className="mt-4 block h-px w-8 bg-white/70" aria-hidden />
          <p className="mt-4 text-sm font-semibold text-white sm:text-base">
            Master Modern Cataract Surgery from World-Renowned Mentors
          </p>
          <Link
            href="#programs"
            className="mt-6 inline-flex items-center gap-2 rounded-[12px] border border-white/15 bg-black/60 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:border-[#ab834d] hover:bg-[#ab834d]"
          >
            <Play className="h-4 w-4 fill-white" aria-hidden />
            Watch Trailer
          </Link>
        </div>
      </div>
    </section>
  );
}
