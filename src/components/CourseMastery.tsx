/**
 * "What You'll Master" — the four-card arc that carries the page from
 * observation to teaching. The cards are a fixed narrative rather than course
 * data: each one is bound to a specific photograph, so the titles and the
 * images have to move together.
 *
 * Geometry is straight off the Figma (1200px column): four 285x403 cards on a
 * 20px gutter, with the even-numbered pair dropped 40px so the row reads as a
 * staggered strip instead of a flat grid.
 */

const CARDS = [
  { title: "Think Like a Specialist", image: "/course-master/master-1.webp" },
  { title: "Decide With\nClinical Confidence", image: "/course-master/master-2.webp" },
  { title: "Operate With\nPrecision & Control", image: "/course-master/master-3.webp" },
  { title: "Lead With\nExpertise & Impact", image: "/course-master/master-4.webp" },
];

/* The card scrim. Figma runs it over the bottom 156 of 403 (38.7%), landing on
   solid black so the title sits on ground rather than on the photograph. */
const SCRIM =
  "linear-gradient(to top, #000 0%, #000 12.5%, rgba(0,0,0,0.5) 42.3%, rgba(76,76,76,0.14) 68.75%, rgba(157,157,157,0) 100%)";

export function CourseMastery() {
  return (
    <section
      aria-labelledby="master-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="master-title"
        className="text-[clamp(1.75rem,3.4vw,2.875rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        What You&apos;ll Master
      </h2>
      <p className="mt-3 text-[15px] text-[#A5A5A5]">From foundation to confidence</p>

      <ul className="mt-10 grid grid-cols-2 gap-4 sm:mt-14 lg:grid-cols-4 lg:gap-5">
        {CARDS.map((card, i) => (
          <li
            key={card.title}
            /* Odd cards ride 40px lower — the stagger only exists once all four
               sit on one row, so it is scoped to lg. */
            className={i % 2 === 1 ? "lg:mt-10" : undefined}
          >
            <article className="relative aspect-[285/403] w-full overflow-hidden rounded-[12px] border border-[#4A4A4A]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[38.7%]"
                style={{ backgroundImage: SCRIM }}
              />

              <span className="absolute left-3.5 top-3.5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-ink-700 bg-accent text-sm font-semibold text-white">
                {i + 1}
              </span>

              <h3 className="absolute inset-x-3 bottom-6 whitespace-pre-line text-center text-[15px] font-medium leading-[1.5] text-white sm:bottom-8 sm:text-lg">
                {card.title}
              </h3>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
