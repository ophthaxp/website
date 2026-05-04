import Image from "next/image";
import Link from "next/link";
import { HERO_IMAGES } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Hero — two pairs of vertical marquee columns flanking the headline.
 * Each side has two columns moving in opposite directions.
 * The track is duplicated so the loop is seamless.
 */
function MarqueeColumn({
  direction,
  offset = 0,
  className,
}: {
  direction: "up" | "down";
  offset?: number;
  className?: string;
}) {
  // Stagger the starting image so paired columns don't look identical
  const rotated = offset
    ? [...HERO_IMAGES.slice(offset), ...HERO_IMAGES.slice(0, offset)]
    : HERO_IMAGES;
  const track = [...rotated, ...rotated];
  return (
    <div
      className={cn(
        "pause-on-hover relative h-[520px] w-[120px] overflow-hidden sm:h-[640px] sm:w-[160px]",
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
            className="relative h-[160px] w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 sm:h-[200px]"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="160px"
              className="object-cover"
              priority={i < 2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MarqueePair({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 sm:gap-4", className)} aria-hidden>
      <MarqueeColumn direction="down" />
      <MarqueeColumn direction="up" offset={2} />
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="get-started"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      <div className="mx-auto grid min-h-[640px] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-10 sm:gap-8 sm:px-8 sm:py-16">
        <MarqueePair />

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
            href="#smart-assist"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-950 shadow-[0_8px_28px_-12px_rgba(255,255,255,0.6)] transition hover:bg-white/90"
          >
            Get Started
          </Link>
        </div>

        <MarqueePair />
      </div>
    </section>
  );
}
