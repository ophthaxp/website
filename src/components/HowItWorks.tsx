import Image from "next/image";
import { Blocks, Layers, Sparkles } from "lucide-react";
import { LoMaIcon } from "./LoMaIcon";

type StepImage = { src: string; alt: string };

/**
 * The four-step path from browsing to enrolment. Each card is a portrait photo
 * with the step badge pinned top-left and the outcome line over a scrim at the
 * bottom; a couple of the cards carry floating chips that hint at what the
 * step actually involves.
 */
const STEPS: { n: number; label: string; title: string }[] = [
  { n: 1, label: "Explore", title: "Explore the Possibilities." },
  { n: 2, label: "Apply", title: "Apply with Conviction." },
  { n: 3, label: "Discovery Call", title: "Discovery Call with the Legend." },
  { n: 4, label: "Transformation", title: "Your Transformation Begins." },
];

/** Specialty pills that drift across the first card. */
const EXPLORE_PILLS = ["Retina", "Refractive Surgery", "Cataract"];

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function HowItWorks({ images }: { images?: StepImage[] }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="how-title"
        className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-[1.3] tracking-[-0.015em] text-white"
      >
        Every Step Towards
        <br className="hidden sm:block" /> Becoming Legendary
      </h2>

      <ol className="mt-12 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:mt-16 lg:grid-cols-4">
        {STEPS.map((step, i) => {
          const img = images?.[i % (images.length || 1)];
          return (
            <li
              key={step.n}
              className="relative isolate aspect-[291/520] overflow-hidden rounded-[14px] border border-white/10 bg-ink-850"
            >
              {img ? (
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                  className="object-cover object-center"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(160deg,#2A2A2A_0%,#141414_55%,#000000_100%)]"
                />
              )}

              {/* Overall darkening so white chips and copy hold up on any photo. */}
              <div aria-hidden className="absolute inset-0 bg-black/35" />

              {/* Step badge */}
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2.5">
                <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {step.n}
                </span>
                <span className="text-[15px] text-white">{step.label}</span>
              </div>

              {/* Per-step decoration */}
              {i === 0 && (
                <>
                  <div className="absolute right-0 top-[70px] z-10 flex flex-col items-end gap-2.5 pr-0">
                    <Chip className="translate-x-2">
                      <LoMaIcon className="h-4 w-4" />
                      Meet <span className="text-[#c084fc]">LOMA</span>
                    </Chip>
                    <Chip className="-translate-x-1">
                      <Blocks className="h-4 w-4 text-white/70" aria-hidden />
                      Access <span className="text-[#c084fc]">LOMA</span> Cases
                    </Chip>
                    <Chip className="-translate-x-3">
                      <Sparkles className="h-4 w-4 text-spark" aria-hidden />
                      Visualize your Future
                    </Chip>
                  </div>
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-[128px] z-10 flex items-center gap-2 overflow-hidden px-0"
                  >
                    {EXPLORE_PILLS.map((p, pi) => (
                      <span
                        key={p}
                        className={`shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/85 backdrop-blur-sm ${
                          pi === 0 ? "-ml-6" : ""
                        }`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {i === 3 && (
                <Chip className="absolute bottom-[150px] left-1/2 z-10 -translate-x-1/2 flex-col gap-1 px-5 py-3 text-center">
                  <Layers className="h-4 w-4 text-white/80" aria-hidden />
                  Hybrid Immersions
                </Chip>
              )}

              {/* Bottom scrim + outcome line */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.75)_45%,rgba(0,0,0,0)_100%)]"
              />
              <p className="absolute inset-x-0 bottom-7 z-10 px-5 text-center text-[22px] font-bold leading-[1.25] text-white">
                {step.title}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
