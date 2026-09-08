"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 *
 * The report is typed out rather than pasted in. Being straight about what that
 * is: the whole thing arrives in one response, so this is a reveal of text we
 * already hold, not a live stream. It earns its place anyway — Iris is a voice
 * giving an opinion, and an opinion that lands whole in a corner of the screen
 * reads as a field that got filled in. Typed, it reads as someone answering.
 *
 * It is also why the two guards below are not optional. Anyone who has read the
 * report once is now waiting on an animation, so it can be skipped, and anyone
 * who has asked their machine for less motion never sees it at all.
 */

type State =
  | { status: "loading" }
  | { status: "ready"; report: CoachReport }
  | { status: "failed"; message: string };

/** One typed run: the whole report, cut into the order it should appear in. */
type Piece = { kind: "improving" | "focus" | "step"; text: string };

const TICK_MS = 24;
/** How long the whole report should take, whatever its length. A short read
 *  should not finish in a blink or a long one outstay its welcome, so the rate
 *  is derived from the text rather than fixed per character. */
const TARGET_MS = 4200;

/**
 * Reveals `text` a few characters at a time.
 *
 * Counting characters across the whole report — not per paragraph — is what
 * keeps the pace even: a one-line "Improving" and a five-step roadmap share one
 * budget instead of each taking their own turn at the same speed.
 */
function useTypewriter(text: string, animate: boolean) {
  const [count, setCount] = useState(animate ? 0 : text.length);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  /** Straight to the end — for the skip button. */
  const finish = useCallback(() => {
    stop();
    setCount(text.length);
  }, [stop, text.length]);

  useEffect(() => {
    if (!animate) {
      setCount(text.length);
      return;
    }

    setCount(0);
    if (text.length === 0) return;

    const step = Math.max(1, Math.ceil(text.length / (TARGET_MS / TICK_MS)));
    let shown = 0;

    timer.current = window.setInterval(() => {
      shown = Math.min(text.length, shown + step);
      setCount(shown);
      if (shown >= text.length) stop();
    }, TICK_MS);

    return stop;
  }, [text, animate, stop]);

  return { count, done: count >= text.length, finish };
}

/** How much of each piece is showing, given a count across all of them. */
function revealPieces(pieces: Piece[], count: number): string[] {
  let left = count;
  return pieces.map((piece) => {
    const take = Math.max(0, Math.min(piece.text.length, left));
    left -= piece.text.length;
    return piece.text.slice(0, take);
  });
}

/** The bar at the end of the sentence being written. */
function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.15em] animate-pulse bg-accent"
    />
  );
}

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
    <div className="animate-fadeIn">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} aria-hidden />
        {label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

/** The report, written out. Split from the panel so the typing state is torn
 *  down and rebuilt whenever a new report replaces an old one. */
function TypedReport({ report }: { report: CoachReport }) {
  /* Read after mount, never on the server — the server has no idea what this
     reader has asked their machine for. Starting false and turning it on is
     also the safe order: the report has not arrived yet at that point, so the
     flip cannot interrupt a run. */
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const pieces = useMemo<Piece[]>(() => {
    const list: Piece[] = [];
    if (report.improving) list.push({ kind: "improving", text: report.improving });
    if (report.focus) list.push({ kind: "focus", text: report.focus });
    for (const step of report.roadmap ?? []) {
      if (step) list.push({ kind: "step", text: step });
    }
    return list;
  }, [report]);

  const full = useMemo(() => pieces.map((p) => p.text).join(""), [pieces]);
  const { count, done, finish } = useTypewriter(full, animate);

  const shown = revealPieces(pieces, count);
  /* The piece the caret sits on: the last one with anything in it. Walked by
     hand rather than with `findLastIndex`, which is newer than some of the
     browsers this has to run in. */
  let writing = -1;
  if (!done) {
    for (let i = shown.length - 1; i >= 0; i -= 1) {
      if (shown[i].length > 0) {
        writing = i;
        break;
      }
    }
  }

  const improving = pieces.findIndex((p) => p.kind === "improving");
  const focus = pieces.findIndex((p) => p.kind === "focus");
  const steps = pieces
    .map((piece, i) => ({ piece, i }))
    .filter(({ piece }) => piece.kind === "step");
  const stepsStarted = steps.some(({ i }) => shown[i].length > 0);

  return (
    <>
      {/* The skip sits where the Live badge will be, so nothing moves when the
          typing ends and one swaps for the other. */}
      <div className="absolute -top-[3px] right-0">
        {done ? (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent ring-1 ring-accent/25">
            Live
          </span>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 ring-1 ring-white/10 transition hover:text-accent hover:ring-accent/25"
          >
            Skip
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-5" aria-busy={!done}>
        {improving >= 0 && shown[improving].length > 0 ? (
          <Section icon={ArrowUpRight} label="Improving">
            {shown[improving]}
            {writing === improving ? <Caret /> : null}
          </Section>
        ) : null}

        {focus >= 0 && shown[focus].length > 0 ? (
          <Section icon={Target} label="Focus next">
            {shown[focus]}
            {writing === focus ? <Caret /> : null}
          </Section>
        ) : null}

        {stepsStarted ? (
          <Section icon={Route} label="Roadmap">
            <ol className="grid gap-2">
              {steps.map(({ i }, n) =>
                shown[i].length > 0 ? (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 tabular-nums text-white/30">
                      {String(n + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {shown[i]}
                      {writing === i ? <Caret /> : null}
                    </span>
                  </li>
                ) : null,
              )}
            </ol>
          </Section>
        ) : null}
      </div>
    </>
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
      <div className="relative">
        <Eyebrow>Iris analysis</Eyebrow>

        {state.status === "ready" && !state.report.empty ? (
          /* Keyed on the fetch so a refreshed analysis types out again rather
             than inheriting the finished state of the one before it. */
          <TypedReport key={refreshKey} report={state.report} />
        ) : (
          <div className="mt-5">
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
            ) : (
              <p className="text-sm leading-relaxed text-white/45">
                Complete a couple of cases and I will map out where to improve.
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
