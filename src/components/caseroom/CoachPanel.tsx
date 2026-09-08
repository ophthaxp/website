"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Route, Target } from "lucide-react";
import { loma } from "@/lib/lomaClient";
import { Eyebrow, Panel, TypingDots } from "./atoms";
import type { CoachReport } from "./types";

/**
 * Iris's read on the last few cases.
 *
 * Its own request rather than part of the profile, because it is generated: it
 * costs a model call and takes seconds, and hanging the whole dashboard on it
 * would mean a doctor waiting on an opinion to see their own XP.
 *
 * `refreshKey` is the number of finished cases. Passing it means the analysis
 * is re-fetched when there is genuinely something new to analyse, and not on
 * every re-render.
 */

type State =
  | { status: "loading" }
  | { status: "ready"; report: CoachReport }
  | { status: "failed"; message: string };

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Target;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} aria-hidden />
        {label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

export function CoachPanel({ refreshKey }: { refreshKey: number }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loma
      .getCoach()
      .then((report: CoachReport) => !cancelled && setState({ status: "ready", report }))
      .catch(
        (err: Error) => !cancelled && setState({ status: "failed", message: err.message }),
      );

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Panel hover="glow">
      <div className="relative flex items-center justify-between gap-4">
        <Eyebrow>Iris analysis</Eyebrow>
        {state.status === "ready" && !state.report.empty ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent ring-1 ring-accent/25">
            Live
          </span>
        ) : null}
      </div>

      <div className="relative mt-5">
        {state.status === "loading" ? (
          <p className="flex items-center gap-3 text-sm text-white/45">
            <TypingDots label="Analysing your recent cases" />
            Reading your recent cases…
          </p>
        ) : state.status === "failed" ? (
          /* Not an alert. The dashboard around it is intact and this is one
             opinion failing to arrive — saying so quietly is honest without
             turning a side panel into an incident. */
          <p className="text-sm text-white/45">{state.message}</p>
        ) : state.report.empty ? (
          <p className="text-sm leading-relaxed text-white/45">
            Complete a couple of cases and I will map out where to improve.
          </p>
        ) : (
          <div className="grid gap-5">
            {state.report.improving ? (
              <Section icon={ArrowUpRight} label="Improving">
                {state.report.improving}
              </Section>
            ) : null}

            {state.report.focus ? (
              <Section icon={Target} label="Focus next">
                {state.report.focus}
              </Section>
            ) : null}

            {state.report.roadmap?.length ? (
              <Section icon={Route} label="Roadmap">
                <ol className="grid gap-2">
                  {state.report.roadmap.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 tabular-nums text-white/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  );
}
