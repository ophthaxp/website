import Image from "next/image";
import Link from "next/link";
import { HERO_IMAGES as FALLBACK_HERO_IMAGES } from "@/lib/data";
import { cn } from "@/lib/utils";

type HeroImg = { src: string; alt: string };

/**
 * Hero — two pairs of vertical marquee columns flanking the headline.
 * Each side has two columns moving in opposite directions.
 * The track is duplicated so the loop is seamless.
 *
 * Images come from backend doctors with `showInHeroSection === true`. If none
 * are flagged we fall back to the placeholder portraits in `lib/data.ts` so
 * the marquee never renders empty.
 */
function MarqueeColumn({
  images,
  direction,
  offset = 0,
  className,
}: {
  images: HeroImg[];
  direction: "up" | "down";
  offset?: number;
  className?: string;
}) {
  // Stagger the starting image so paired columns don't look identical
  const rotated = offset
    ? [...images.slice(offset), ...images.slice(0, offset)]
    : images;
  const track = [...rotated, ...rotated];
  return (
    <div
      className={cn(
        "pause-on-hover relative h-[600px] w-[180px] overflow-hidden sm:h-[760px] sm:w-[260px]",
        className,
      )}
      aria-hidden
    >
      {/* top + bottom fade masks */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-vignette-y" />
      <div
        className={cn(
          "marquee-track flex flex-col gap-4",
          direction === "up" ? "animate-scrollY" : "animate-scrollYReverse",
        )}
      >
        {track.map((img, i) => (
          <div
            key={`${direction}-${offset}-${i}`}
            className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:h-[300px]"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 180px, 260px"
              className="object-cover"
              priority={i < 2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero({ images }: { images?: HeroImg[] }) {
  // Need at least 4 distinct frames so the duplicated track loops smoothly.
  // If the admin has only flagged 1–3 doctors, repeat the list to fill it.
  let list = images && images.length > 0 ? images : FALLBACK_HERO_IMAGES;
  while (list.length < 4) list = [...list, ...list];

  return (
    <section
      id="get-started"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      <div className="mx-auto grid min-h-[640px] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-10 sm:gap-8 sm:px-8 sm:py-16">
        <MarqueeColumn images={list} direction="down" />

        <div className="flex flex-col items-center text-center">
          <h1
            id="hero-title"
            className="font-serif text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl"
          >
            Be the Best
            <br />
            Learn from the
            <br />
            <span className="italic">Legends</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
            Live, cohort-based mentorship for practicing ophthalmologists to
            advance surgical expertise. Selective cohorts. Multiple batches.
          </p>
          <Link
            href="#programs"
            className="mt-7 inline-flex items-center justify-center rounded-[12px] border border-[#2A2A2A] bg-[#1A1A1A] px-7 py-2.5 text-sm font-medium text-white shadow-[0_8px_28px_-12px_rgba(0,0,0,0.8)] transition hover:bg-[#222]"
          >
            Get Started
          </Link>
        </div>

        <MarqueeColumn images={list} direction="up" offset={2} />
      </div>
    </section>
  );
}
