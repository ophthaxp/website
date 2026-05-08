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
        Learn from Those Who&rsquo;ve <br className="hidden sm:block" />
        Defined the Field
      </h2>

      <div className="relative mx-auto mt-10 aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-ink-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_VIDEO_POSTER}
          alt="Senior ophthalmology consultant introducing the OphthaXP mentorship cohorts"
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
