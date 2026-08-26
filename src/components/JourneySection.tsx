const STEPS: { word: string; title: string; blurb: string }[] = [
  {
    word: "Access",
    title: "Access the Inaccessible",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
  {
    word: "Knowledge",
    title: "Get Mentored from the Best",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
  {
    word: "Breakthrough",
    title: "Don't just upskill, Chase Breakthroughs",
    blurb: "Reserved for those who seek knowledge beyond the ordinary.",
  },
];

/**
 * The three-card promise block. Each card repeats its own headline word as an
 * oversized ghost layer that bleeds off the right edge — the card clips it,
 * which is what gives the crop its deliberate look.
 *
 * The cards stack on scroll: each one is sticky at a slightly lower offset than
 * the last (see .journey-card in globals.css), so a card that has been read
 * stays pinned as a thin edge behind the one arriving over it. The offsets come
 * from the card's index, passed down as the --i custom property.
 */
export function JourneySection() {
  return (
    <section
      aria-labelledby="journey-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="journey-title"
        className="mx-auto max-w-3xl text-center text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-[1.25] tracking-[-0.01em] text-white"
      >
        The Journey That Changes
        <br className="hidden sm:block" /> More Than Your Skills
      </h2>

      <ul className="journey-stack mt-12 sm:mt-16">
        {STEPS.map((s, i) => (
          <li
            key={s.word}
            style={{ "--i": i } as React.CSSProperties}
            className="journey-card relative isolate overflow-hidden rounded-[24px] bg-ink-700 px-6 pb-8 pt-8 sm:rounded-[32px] sm:px-12 sm:pb-12 sm:pt-12 lg:min-h-[516px] lg:pt-[calc(var(--stack-step)+2rem)]"
          >
            {/* Ghost repeat — sits behind everything, cropped by the card. */}
            <span
              aria-hidden
              className="ghost-word pointer-events-none absolute bottom-0 left-0 -z-10 whitespace-nowrap font-display text-[26vw] leading-[0.76] sm:left-2 sm:text-[20vw] lg:bottom-2 lg:text-[225px]"
            >
              {s.word}
            </span>

            <p className="font-display text-[clamp(2.5rem,7.2vw,6.5rem)] leading-[0.9] text-accent">
              {s.word}
            </p>

            <p className="mt-5 max-w-[19rem] text-[clamp(1.375rem,2.8vw,2.5rem)] font-semibold leading-[1.24] text-white sm:mt-7">
              {s.title}
            </p>

            {/* Fine print — bottom-right on wide cards, in flow on narrow ones. */}
            <p className="mt-10 max-w-[19rem] text-sm leading-relaxed text-white/45 lg:absolute lg:bottom-[74px] lg:right-12 lg:mt-0">
              {s.blurb}
            </p>
          </li>
        ))}

        {/* Scroll runway for the lg stack. A sticky card is clamped to its
            container's content box, so without a trailing item the last card
            can never reach its own offset — it just drags the pinned cards away
            as it arrives. This spacer is what holds the finished stack on
            screen, and it costs no visible space: the pinned cards cover it the
            whole time. Its height is exactly how long the stack holds. */}
        <li aria-hidden className="hidden lg:block lg:h-[38vh]" />
      </ul>
    </section>
  );
}
