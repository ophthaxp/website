import { PaneShell } from "./panes";
import type { PathwayMatch } from "./PathwaysPanel";

/**
 * Pane 04 — the one programme we would point this doctor at next.
 *
 * A preview, not a second programmes page: the name, the promise, who leads it
 * and what it covers, then out to the real thing. The full list, the discovery
 * and record toggle and their own applications all live in the Pathways section
 * further down; repeating them here would make the rail's fourth stop a
 * duplicate of a whole section rather than a way into it.
 */
export function MatchedPathwayPane({ match }: { match: PathwayMatch | null }) {
  if (!match) {
    return (
      <PaneShell
        eyebrow="Your path to mastery"
        title="Pathways"
        pill={{ label: "Unavailable", tone: "quiet" }}
        footnote="The programme list is not loading just now."
        cta={{ label: "Browse programmes", href: "/programs" }}
      >
        <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
          <p className="max-w-md text-sm leading-relaxed text-white/55">
            Everything on offer is on the programmes page.
          </p>
        </div>
      </PaneShell>
    );
  }

  return (
    <PaneShell
      eyebrow="Your path to mastery"
      title="Pathways"
      pill={{ label: "Matched", tone: "ready" }}
      footnote="Matched to what you have not applied for yet."
      cta={{ label: "View matched pathway", href: `/programs/${match.slug}` }}
    >
      <div className="relative h-full overflow-hidden rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/[0.06] sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-[-5rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.18),rgba(183,90,68,0)_66%)]"
        />

        <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Matched pathway
          </p>
          {match.duration ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-soft">
              {match.duration}
            </p>
          ) : null}
        </div>

        <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
          {match.name}
        </p>
        <p className="relative mt-3 max-w-2xl font-serif text-[clamp(1.6rem,3vw,2.5rem)] leading-[1.1] text-white">
          {match.blurb}
        </p>

        {match.mentor ? (
          <div className="relative mt-7 flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent-tint ring-1 ring-accent/25"
            >
              {initials(match.mentor)}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Led by
              </p>
              <p className="mt-0.5 text-sm text-white/80">{match.mentor}</p>
            </div>
          </div>
        ) : null}

        {match.tags && match.tags.length > 0 ? (
          <ul className="relative mt-7 flex flex-wrap gap-2.5">
            {match.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PaneShell>
  );
}

/** "Dr. Srinivas K. Rao" reduces to SR — first and last word, initial of each. */
function initials(name: string): string {
  const words = name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
