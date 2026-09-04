"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * "Map what comes next" — the small card beside Explore Programmes.
 *
 * Two views of the same question, behind one toggle:
 *
 *   **Discovery** — the programme we would point this doctor at next.
 *   **Record**    — what they have actually applied for, and where it stands.
 *
 * They are a toggle rather than two cards because they answer the same question
 * from opposite ends, and because a doctor mid-application wants the record
 * while a doctor between programmes wants the suggestion; whichever they are,
 * the other one is clutter.
 */

export interface PathwayMatch {
  name: string;
  slug: string;
  /** The programme's own promise — its headline, tagline or description. */
  blurb: string;
  /** Who leads it. Absent where the course row has no linked doctor. */
  mentor?: string;
  /** "12 weeks", "6 months" — whichever the row actually states. */
  duration?: string;
  /** The programme's own highlights, used as the chips on the matched pane. */
  tags?: string[];
}

export interface PathwayRecord {
  total: number;
  submitted: number;
  /** The most recent application's status headline, as the account page phrases it. */
  latestTitle: string | null;
  latestBody: string | null;
}

type View = "discovery" | "record";

export function PathwaysPanel({
  match,
  record,
}: {
  match: PathwayMatch | null;
  record: PathwayRecord;
}) {
  // Somebody with an application open is far more likely to have come here to
  // check it, so that is what opens.
  const [view, setView] = useState<View>(record.total > 0 ? "record" : "discovery");

  return (
    <section className="flex flex-col rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Pathways
          </p>
          <p className="mt-1.5 text-sm text-white/45">Map what comes next</p>
        </div>

        <div
          role="tablist"
          aria-label="What to show"
          className="flex shrink-0 rounded-full bg-black/50 p-1 ring-1 ring-white/10"
        >
          {(["discovery", "record"] as View[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                view === key
                  ? "bg-white/[0.09] text-white"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              {key === "discovery" ? "Discovery" : "Record"}
            </button>
          ))}
        </div>
      </div>

      <hr className="mt-6 border-white/[0.07]" />

      <div className="mt-8 flex flex-1 flex-col">
        {view === "discovery" ? <Discovery match={match} /> : <Record record={record} />}
      </div>
    </section>
  );
}

function Discovery({ match }: { match: PathwayMatch | null }) {
  if (!match) {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          A considered match
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          The programme list is not loading just now. Everything on offer is on the programmes
          page.
        </p>
        <Cta href="/programs" label="Browse programmes" />
      </>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        A considered match
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight text-white">{match.name}</h2>
      <p className="mt-4 text-sm leading-relaxed text-white/55">{match.blurb}</p>
      <Cta href={`/programs/${match.slug}`} label="View pathway" />
    </>
  );
}

function Record({ record }: { record: PathwayRecord }) {
  if (record.total === 0) {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Your record
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Nothing applied for yet. The moment you start an application it is kept here, half
          finished and all.
        </p>
        <Cta href="/programs" label="Find a programme" />
      </>
    );
  }

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Your record
      </p>
      <p className="mt-3 font-serif text-3xl leading-tight text-white">
        {record.total} {record.total === 1 ? "application" : "applications"}
        {record.submitted > 0 ? (
          <span className="text-white/35"> · {record.submitted} submitted</span>
        ) : null}
      </p>
      {record.latestTitle ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-white">{record.latestTitle}</p>
          {record.latestBody ? (
            <p className="mt-1 text-sm leading-relaxed text-white/55">{record.latestBody}</p>
          ) : null}
        </div>
      ) : null}
      <Cta href="#applications" label="See your applications" />
    </>
  );
}

/** The one link out of this card, always pinned to the bottom of it. */
function Cta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-accent transition hover:text-accent-soft"
    >
      {label}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
