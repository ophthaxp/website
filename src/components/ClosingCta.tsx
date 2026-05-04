import Link from "next/link";

export function ClosingCta() {
  return (
    <section
      aria-labelledby="closing-title"
      className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28"
    >
      <h2
        id="closing-title"
        className="font-serif text-3xl leading-snug text-white sm:text-5xl"
      >
        <span className="text-white">What you choose</span>
        <span className="text-white/55">
          {" "}
          to learn shapes how you grow, and the right path goes beyond knowledge to
          truly expand your impact. Take a moment to see where it can lead you.
        </span>
      </h2>

      <Link
        href="#smart-assist"
        className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
      >
        Find your path
      </Link>
    </section>
  );
}
