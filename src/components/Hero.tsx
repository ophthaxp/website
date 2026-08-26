import Image from "next/image";
import Link from "next/link";
import { HERO_IMAGES as FALLBACK_HERO_IMAGES } from "@/lib/data";

type HeroImg = { src: string; alt: string };

/** Portraits shown in the strip on the widest breakpoint. */
const STRIP_COUNT = 7;

/**
 * Hero — an edge-to-edge band of mentor portraits that dissolves into black,
 * with the headline sitting on the black below it.
 *
 * Portraits come from backend doctors flagged `showInHeroSection`; when the
 * admin has flagged fewer than seven the list is repeated so the band always
 * spans the full width rather than ending mid-row.
 */
export function Hero({ images }: { images?: HeroImg[] }) {
  let list = images && images.length > 0 ? images : FALLBACK_HERO_IMAGES;
  while (list.length < STRIP_COUNT) list = [...list, ...list];
  const strip = list.slice(0, STRIP_COUNT);

  return (
    <section
      id="get-started"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-black"
    >
      {/* Portrait band. Columns drop off from the right as the viewport narrows
          so each remaining portrait keeps a usable width instead of turning
          into a sliver. */}
      <div className="relative">
        <div className="grid h-[260px] grid-cols-3 sm:h-[320px] sm:grid-cols-4 lg:h-[400px] lg:grid-cols-7">
          {strip.map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className={[
                "relative h-full w-full overflow-hidden bg-ink-850",
                i >= 3 ? "hidden sm:block" : "",
                i >= 4 ? "hidden lg:block" : "",
              ].join(" ")}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 640px) 34vw, (max-width: 1024px) 25vw, 15vw"
                className="object-cover object-top"
                priority={i < 4}
              />
            </div>
          ))}
        </div>
        {/* Portraits are lit brighter than the reference frames, so the band
            carries an even scrim before the fade takes over — otherwise the
            strip glares against the black page around it. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/25" />
        {/* Bottom fade to black — the headline reads as if the band melts into it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-hero-fade"
        />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 text-center sm:px-10 sm:pb-24 sm:pt-10">
        <h1 id="hero-title" className="text-white">
          <span className="block font-display text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.98] tracking-[-0.01em]">
            Become <span className="text-accent">Legendary</span>
          </span>
          <span className="mt-2 block font-display text-[clamp(1.5rem,3.3vw,3rem)] uppercase leading-tight tracking-[0.005em]">
            Learn from the Legends
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base text-white/60 sm:text-lg">
          Transforming how ophthalmologists think, decide, and practice
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="#programs"
            className="inline-flex items-center justify-center rounded-[10px] bg-accent px-7 py-3.5 text-base font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Begin Your Journey
          </Link>
        </div>
      </div>
    </section>
  );
}
