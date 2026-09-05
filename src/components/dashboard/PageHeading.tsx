/**
 * The top of every dashboard section: a quiet label, then one serif line saying
 * what this part is for.
 *
 * The sentence is the design. Each section opens on a statement rather than a
 * control panel, which is what keeps a logged-in page feeling like the rest of
 * the site instead of an admin console that happens to share its colours.
 *
 * All three sections live on one page now, so only the first is the page's
 * heading — hence `level`. Three `h1`s would read to a screen reader as three
 * documents stapled together.
 */
export function PageHeading({
  eyebrow,
  title,
  aside,
  id,
  level = 2,
}: {
  eyebrow: string;
  title: React.ReactNode;
  /** Optional right-hand block — the welcome line, on Your Space. */
  aside?: React.ReactNode;
  /** Ties the section to its heading for `aria-labelledby`. */
  id?: string;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
          {eyebrow}
        </p>
        <Heading
          id={id}
          className="mt-3 font-serif text-[clamp(2rem,4.6vw,3.9rem)] leading-[1.05] tracking-[-0.015em] text-white"
        >
          {title}
        </Heading>
      </div>
      {aside ? <div className="shrink-0 text-right">{aside}</div> : null}
    </div>
  );
}
