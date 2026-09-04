"use client";

import { useEffect, useState } from "react";
import { readOutlook, type OutlookSnapshot } from "@/lib/outlookSnapshot";
import { formatINRShort, formatPeopleShort } from "@/lib/utils";
import { OutlookDial } from "./OutlookDial";
import { PaneShell } from "./panes";

/**
 * Pane 01 — the last outlook this doctor ran.
 *
 * A **record**, like every other pane on the thread: what you last asked, and
 * one button back to where you can ask again. Not a second calculator. There is
 * one calculator and it lives on the ROI section of the home page; a copy here
 * would be two places to keep in step and two answers to reconcile, and the
 * first time they disagreed the doctor would be the one to notice.
 *
 * Two places an outlook can come from, in this order:
 *
 *   1. **the account** — `serverOutlook`, read on the server and handed down.
 *      Already here on first paint, and the same on every device they sign in
 *      from, which is the whole reason it is stored at all.
 *   2. **this browser** — the `localStorage` copy, which is what an anonymous
 *      visitor gets, and what covers a doctor whose outlook predates the store.
 *
 * `undefined` means the browser has not been read yet, so the pane never
 * renders an empty state and then swaps it for a filled one — which flickers,
 * and on a slow phone flickers long enough to be read. When the account already
 * has an outlook there is no such moment: it starts filled.
 */
export function HorizonPanel({ serverOutlook }: { serverOutlook: OutlookSnapshot | null }) {
  const [outlook, setOutlook] = useState<OutlookSnapshot | null | undefined>(
    serverOutlook ?? undefined,
  );

  useEffect(() => {
    // The account's copy wins outright — it is the one that travels.
    if (serverOutlook) return;
    setOutlook(readOutlook());
  }, [serverOutlook]);

  const loading = outlook === undefined;

  return (
    <PaneShell
      eyebrow="Your horizon"
      meta={outlook ? `generated ${shortDate(outlook.savedAt)}` : undefined}
      title="Visualise your future"
      pill={{
        label: loading ? "Loading" : outlook ? "Outlook ready" : "Not run yet",
        tone: outlook ? "ready" : "quiet",
      }}
      footnote={
        outlook
          ? "Change the inputs to see how your clinical reach responds."
          : "It takes about a minute."
      }
      cta={{
        label: outlook ? "Explore the outlook" : "Run your first outlook",
        href: "/#roi",
      }}
    >
      {outlook ? <Filled outlook={outlook} /> : <Empty loading={loading} />}
    </PaneShell>
  );
}

function Filled({ outlook }: { outlook: OutlookSnapshot }) {
  const where = [outlook.place, outlook.region].filter(Boolean).join(", ") || outlook.pincode;

  const stats = [
    { label: "Catchment population", value: formatPeopleShort(outlook.serviceablePopulation) },
    { label: "Disease burden", value: formatPeopleShort(outlook.prevalenceCount) },
    { label: "Economic potential", value: formatINRShort(outlook.projectedRevenue) },
    { label: "Clinical impact", value: `${outlook.impactPct.toFixed(2)}%` },
  ];

  return (
    <div className="grid h-full gap-6 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06] sm:p-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8">
      <div className="mx-auto aspect-square w-full max-w-[340px]">
        <OutlookDial radiusKm={outlook.radiusKm} points={outlook.points} />
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
          Latest outlook
        </p>
        <h4 className="mt-2 font-serif text-2xl leading-tight text-white sm:text-[2rem]">
          {outlook.specialization} <span className="text-white/30">·</span> {where}
        </h4>

        <dl className="mt-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline justify-between gap-4 border-b border-white/[0.07] py-3.5 last:border-b-0"
            >
              <dt className="text-sm text-white/55">{stat.label}</dt>
              <dd className="text-base font-semibold tabular-nums text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {outlook.pincodesInRadius > 0 ? (
          <p className="mt-5 flex items-center gap-2.5 text-xs text-white/45">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {outlook.pincodesInRadius} pincodes mapped across the service radius
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Nothing run yet — and nothing invented to fill the gap.
 *
 * A dashboard that opens with placeholder figures teaches a doctor that its
 * numbers are decorative, which is the one thing this pane cannot afford.
 */
function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
      <p className="max-w-md font-serif text-xl leading-snug text-white/85">
        {loading
          ? "Looking for your last outlook…"
          : "Pick a location and a specialty, and see the practice your present choices are quietly building."}
      </p>
      {!loading ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
          Catchment population, disease burden, economic potential and clinical impact — for your
          own pincode. Your most recent one shows up here.
        </p>
      ) : null}
    </div>
  );
}

/** "28 August" — the year is noise for something saved days ago. */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}
