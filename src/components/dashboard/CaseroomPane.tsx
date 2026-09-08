"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { loma } from "@/lib/lomaClient";
import { levelName } from "@/components/caseroom/scoring";
import {
  accuracyMovement,
  casesThisWeek,
  improvingCount,
  recentHigh,
  typicalMinutes,
  weakestMetric,
} from "@/components/caseroom/summary";
import type { CoachReport, LomaProfile } from "@/components/caseroom/types";
import type { ThreadItem } from "./thread";
import { PaneShell } from "./panes";

/**
 * Caseroom, on Your Space.
 *
 * A report on where this doctor's judgement stands, and a way in — not the tool
 * itself. Caseroom is a place somebody works for twenty minutes with a patient
 * in front of them, and running that inside a tab beside the ROI calculator
 * would mean a stray click on the thread abandons a case mid-workup.
 *
 * Two rules carried over from the pane this replaces:
 *
 *  - It asks for nothing until it is looked at. Your Space keeps every pane
 *    mounted so the calculator does not lose its state, which means a pane that
 *    loads on mount loads for every doctor who never opens it. Iris's analysis
 *    is a model call, so this matters more here than anywhere else on the page.
 *  - It never invents a number. Every figure below is measured or absent. A
 *    doctor three cases in sees three real numbers and no trend line, because a
 *    made-up trend would make the real figures beside it worthless.
 */

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; profile: LomaProfile; coach: CoachReport | null }
  | { status: "failed" };

/** One of the four figures across the middle. */
function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.025] px-5 py-4 ring-1 ring-white/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-3 font-serif text-[2.4rem] leading-none tabular-nums text-white">{value}</p>
      {/* The line under a figure is where its meaning lives — "14" is a count,
          "+2 this week" is a direction. It is left out rather than filled when
          there is nothing measured to put there. */}
      <p className="mt-2 h-4 text-xs text-white/35">{note ?? ""}</p>
    </div>
  );
}

/**
 * The level rail.
 *
 * The doctor's level, the two ahead of it, and then the horizon. Not a progress
 * bar: there is no percentage along it and no end to fill toward. What it says
 * is that the next level is within reach and the ladder keeps going.
 *
 * Only the current level is drawn as a marker. The two ahead are bare numerals,
 * because ringing all three would give them equal weight and the rail would
 * read as three buttons rather than one position on a road.
 *
 * The line is built from segments *between* the stops rather than one rule
 * running under them. Drawn the other way each numeral needs an opaque patch to
 * hide the line behind it, and that patch is only invisible if it exactly
 * matches whatever it sits on — which it did not, so the rail wore three black
 * rectangles. Segments have nothing to hide and hold up on any background.
 */
function LevelRail({ level }: { level: number }) {
  /* Equal segments: each step is one level, so an uneven rail would imply some
     cost more than others. */
  const line = <span aria-hidden className="h-px flex-1 bg-white/[0.09]" />;

  return (
    <div className="rounded-[18px] bg-white/[0.015] px-7 py-8 ring-1 ring-white/[0.05]">
      <div className="flex items-center">
        {/* Where the climb began. */}
        <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />

        {line}

        {/* The current level, and the light behind it. The halo is what makes
            this read as the lit point on an unlit line — a ring alone competes
            with the numerals rather than outranking them. */}
        <span className="relative grid h-11 w-11 shrink-0 place-items-center">
          <span
            aria-hidden
            className="absolute h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.22),rgba(183,90,68,0)_68%)]"
          />
          <span className="relative grid h-11 w-11 place-items-center rounded-full text-[15px] tabular-nums text-accent ring-1 ring-accent/80">
            {level}
          </span>
        </span>

        {line}

        <span aria-hidden className="shrink-0 px-3.5 text-[15px] tabular-nums text-white/25">
          {level + 1}
        </span>

        {line}

        <span aria-hidden className="shrink-0 px-3.5 text-[15px] tabular-nums text-white/25">
          {level + 2}
        </span>

        {line}

        <span aria-hidden className="shrink-0 pl-3.5 text-[26px] leading-none text-white/35">
          ∞
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Your current level
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
          The horizon continues
        </p>
      </div>

      <p className="sr-only">
        You are on level {level}, {levelName(level)}. The next levels are {level + 1} and{" "}
        {level + 2}.
      </p>
    </div>
  );
}

/** One of the three readings under Iris's sentence. */
function Reading({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-5 first:pl-0 last:pr-0">
      <p className="font-serif text-2xl leading-none tabular-nums text-white/90">{value}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
    </div>
  );
}

export function CaseroomPane({ item, active }: { item: ThreadItem; active: boolean }) {
  const [state, setState] = useState<State>({ status: "idle" });

  /* Whether the one request this pane makes has been started, and whether the
     pane is still on screen.
     
     Both are refs rather than state, and that is the point. An earlier version
     kept `state.status` in the dependency list and guarded on it; setting the
     status to "loading" then re-ran the effect, which fired the previous run's
     cleanup, which cancelled the request that run had just started. The reply
     arrived to a listener that had already been told to ignore it, and the pane
     said "Loading your progress…" for as long as you left it open.
     
     A ref does not re-run the effect, so the request survives its own start.
     Only unmounting stops it — and specifically not switching to another pane
     and back, which would otherwise abandon an in-flight request and leave the
     same dead spinner behind. */
  const requested = useRef(false);
  const onScreen = useRef(true);

  useEffect(() => {
    onScreen.current = true;
    return () => {
      onScreen.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active || requested.current) return;
    requested.current = true;

    setState({ status: "loading" });

    /* The profile decides whether this pane can be drawn; Iris only fills one
       card in it. Asking for both together and letting the analysis resolve to
       null means a slow or failed model call costs that card, not the pane. */
    Promise.all([loma.peekProfile(), loma.getCoachQuiet().catch(() => null)])
      .then(([profile, coach]: [LomaProfile, CoachReport | null]) => {
        if (onScreen.current) setState({ status: "ready", profile, coach });
      })
      .catch(() => {
        if (onScreen.current) setState({ status: "failed" });
      });
  }, [active]);

  const profile = state.status === "ready" ? state.profile : null;
  const coach = state.status === "ready" ? state.coach : null;
  const stats = profile?.stats;
  const history = profile?.history ?? [];
  const started = Boolean(stats && stats.total_cases > 0);

  // Nothing worked yet, or nothing loaded. One invitation, no invented figures.
  if (!profile || !stats || !started) {
    return (
      <PaneShell
        eyebrow={item.eyebrow}
        title={item.name}
        attribution={item.attribution}
        pill={{ label: "Open", tone: "ready" }}
        cta={{ label: "Start your first case", href: "/account/caseroom" }}
      >
        <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
          <p className="max-w-md font-serif text-xl leading-snug text-white/85">
            A patient walks in. You take the history, order what you need, and commit to a
            diagnosis.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">
            {state.status === "loading"
              ? "Loading your progress…"
              : "Every case is written for the level you are on, and graded on your reasoning rather than the answer alone."}
          </p>
        </div>
      </PaneShell>
    );
  }

  const week = casesThisWeek(history);
  const movement = accuracyMovement(history);
  const high = recentHigh(history);
  const weakest = weakestMetric(stats);
  const improving = improvingCount(history, stats);
  const minutes = typicalMinutes(history);

  const topic =
    profile.enrollments?.find((e) => e.program_id === profile.active_program_id)?.topic ??
    profile.topic;

  return (
    <PaneShell
      eyebrow={item.eyebrow}
      title={item.name}
      attribution={item.attribution}
      pill={{ label: `Level ${profile.level}`, tone: "quiet" }}
      footnote={`${levelName(profile.level)} · ${profile.xp} XP`}
      cta={{ label: "Work a case", href: "/account/caseroom" }}
    >
      <div className="grid gap-4">
        <LevelRail level={profile.level} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Figure
            label="Cases completed"
            value={stats.total_cases}
            note={week > 0 ? `+${week} this week` : null}
          />
          <Figure
            label="Diagnostic accuracy"
            value={`${Math.round(stats.accuracy)}%`}
            note={
              movement === null
                ? null
                : `${movement >= 0 ? "+" : ""}${movement}% across recent cases`
            }
          />
          <Figure
            label="Current streak"
            value={stats.current_streak}
            note={stats.current_streak === 1 ? "day in practice" : "days in practice"}
          />
          <Figure
            label="Current level"
            value={profile.level}
            note={levelName(profile.level)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Iris. */}
          <div className="rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Iris analysis
              </p>
              {improving > 0 ? (
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {improving} improving
                </span>
              ) : null}
            </div>

            <p className="mt-4 font-serif text-[clamp(1.15rem,1.7vw,1.5rem)] leading-snug text-white">
              {[coach?.improving, coach?.focus].filter(Boolean).join(" ") ||
                "Not enough cases yet for Iris to read a pattern."}
            </p>

            {high !== null || movement !== null || weakest ? (
              <div className="mt-6 flex divide-x divide-white/[0.07]">
                {high !== null ? <Reading value={`${high}/10`} label="Recent high" /> : null}
                {movement !== null ? (
                  <Reading
                    value={`${movement >= 0 ? "+" : ""}${movement}%`}
                    label="Accuracy movement"
                  />
                ) : null}
                {weakest ? (
                  <Reading value={`${weakest.score}/10`} label={`${weakest.label} low`} />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* What is waiting. */}
          <div className="flex flex-col rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Next adaptive case
            </p>

            {/* Deliberately not a case title. The platform picks the next case
                at the moment it is started — a weighted choice among the ones
                this doctor has played least — so no title can be promised here
                without the risk of serving a different patient on the click.
                What is certain is the topic and the level it will be pitched
                at, so that is what is said. */}
            <p className="mt-4 font-serif text-[clamp(1.15rem,1.7vw,1.5rem)] leading-snug text-white">
              A fresh {topic ? `${topic} ` : ""}patient, pitched at level {profile.level}
            </p>

            {minutes ? (
              <p className="mt-auto flex items-center gap-2 pt-6 text-xs text-white/35">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {minutes.low}–{minutes.high} min, at your pace
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </PaneShell>
  );
}
