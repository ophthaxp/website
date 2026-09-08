"use client";

import { PointerGlow } from "@/components/dashboard/PointerGlow";
import { TIER_COLOR, levelFromXp, levelName, scoreTier } from "./scoring";

/**
 * The small parts the Caseroom screens share.
 *
 * Restyled onto the dashboard's palette rather than carried over: the
 * standalone app was teal on near-black, this is terracotta on true black, and
 * a teal ring in here would read as a component from somebody else's product.
 * The shapes and the numbers are unchanged — only what they are drawn with.
 */

/** Waiting on the model. Used in the chat, the coach panel and the boot splash. */
export function TypingDots({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" role="status" aria-label={label ?? "Thinking"}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/45"
          // Staggered so it reads as a wave rather than three lights blinking
          // together. 160ms is about the slowest that still looks like one motion.
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1.1s" }}
        />
      ))}
    </span>
  );
}

/**
 * How a card answers the cursor, borrowed from the Growth Lab tool cards so
 * Caseroom does not sit inside the same dashboard behaving like a different
 * product.
 *
 * Two settings rather than one. `lift` is the full Growth Lab move — the card
 * rises a step and casts a shadow — and it suits a card the whole of which is
 * one thing: a stat, an invitation to start. `glow` is the same light and the
 * same warming ring without the rise, for the tall panels a doctor works
 * *inside*. A panel that lifts while they are reaching for a row in it moves
 * the row, and every open drawer under the pointer would bob.
 */
const PANEL_HOVER = {
  lift: "group relative overflow-hidden transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_60px_-24px_rgba(0,0,0,0.95)] hover:ring-accent/30",
  glow: "group relative overflow-hidden transition duration-300 ease-out hover:ring-accent/20",
  none: "",
} as const;

/**
 * The standard card. One place, so twelve panels cannot drift apart.
 *
 * The pointer light is a sibling of the children rather than a wrapper around
 * them: several callers set their own flex or grid on the Panel and count on
 * their children being its direct children. It is positioned and they are not,
 * so anything that must sit above the light says `relative` for itself — the
 * same arrangement `ToolCard` uses.
 */
export function Panel({
  children,
  className = "",
  as: Tag = "div",
  hover = "none",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "aside";
  hover?: keyof typeof PANEL_HOVER;
}) {
  return (
    <Tag
      className={`rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] ${PANEL_HOVER[hover]} ${className}`}
    >
      {hover === "none" ? null : <PointerGlow />}
      {children}
    </Tag>
  );
}

/** The quiet uppercase label above a heading, as the rest of the dashboard sets it. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{children}</p>
  );
}

/**
 * A 0–10 gauge.
 *
 * `pathLength="100"` lets the dash array be written in whole percent regardless
 * of the radius, so one component serves the 76px overall ring and the 46px
 * category rings without recomputing circumference for each.
 */
export function ScoreRing({
  score,
  size,
  strokeWidth,
  label,
  sublabel,
}: {
  score: number;
  size: number;
  strokeWidth: number;
  label?: string;
  sublabel?: string;
}) {
  const tier = scoreTier(score);
  const radius = (size - strokeWidth) / 2;
  const color = TIER_COLOR[tier];

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1.5 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${score * 10} ${100 - score * 10}`}
            /* Start at twelve o'clock rather than three, which is where a gauge
               is read from. */
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: Math.round(size * 0.3), color }}
        >
          {score}
        </span>
      </div>
      {label ? <span className="text-[11px] leading-tight text-white/55">{label}</span> : null}
      {sublabel ? <span className="text-[10px] tabular-nums text-white/35">{sublabel}</span> : null}
    </div>
  );
}

/**
 * A row of rings: the overall score, then each category it was scored on.
 *
 * Laid out as columns that share the width rather than as fixed tiles in a
 * flex-wrap. The number of categories is not fixed — a legend defines their own
 * — so a fixed tile width either leaves a gap at the right or wraps one orphan
 * under the first column. `auto-fit` spreads whatever it is given evenly and
 * wraps into full columns when it has to.
 */
export function ScoreRow({
  overall,
  metrics,
  size = 46,
}: {
  overall: number | null;
  metrics: Array<{ key: string; label: string; score: number }>;
  size?: number;
}) {
  if (typeof overall !== "number" && metrics.length === 0) return null;

  return (
    <div
      className="grid items-start gap-x-3 gap-y-6"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(5.25rem, 1fr))" }}
    >
      {typeof overall === "number" ? (
        <ScoreRing score={overall} size={size + 26} strokeWidth={6} label="Overall" sublabel="/10" />
      ) : null}
      {metrics.map((metric) => (
        <ScoreRing key={metric.key} score={metric.score} size={size} strokeWidth={4.5} label={metric.label} />
      ))}
    </div>
  );
}

/** Right / wrong, and how the reasoning was judged. */
export function VerdictTag({ correct }: { correct: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ring-1 ${
        correct
          ? "bg-[#7FA98A]/10 text-[#7FA98A] ring-[#7FA98A]/25"
          : "bg-[#CF7A70]/10 text-[#CF7A70] ring-[#CF7A70]/25"
      }`}
    >
      {correct ? "Correct" : "Incorrect"}
    </span>
  );
}

export function QualityTag({ quality }: { quality: string }) {
  return (
    <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium capitalize tracking-[0.04em] text-white/60 ring-1 ring-white/10">
      {quality}
    </span>
  );
}

/** An XP change, coloured by direction. Zero is not a failure, so it stays neutral. */
export function XpDelta({ delta, className = "" }: { delta: number; className?: string }) {
  const tone = delta > 0 ? "text-[#7FA98A]" : delta < 0 ? "text-[#CF7A70]" : "text-white/45";
  return (
    <span className={`tabular-nums font-medium ${tone} ${className}`}>
      {delta > 0 ? "+" : ""}
      {delta} XP
    </span>
  );
}

/**
 * The level bar across the top of the dashboard.
 *
 * XP runs 0–100 and level is XP/10, so the track doubles as both: the fill is
 * the raw XP and the ten ticks under it are the levels. One bar answering both
 * questions is what makes "how far to the next one" readable without arithmetic.
 */
export function LevelMeter({ xp }: { xp: number }) {
  const level = levelFromXp(xp);
  const toNext = level < 10 ? level * 10 + 1 - xp : 0;

  return (
    <Panel hover="glow">
      <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <Eyebrow>Current level</Eyebrow>
          <p className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-none text-white">
            {levelName(level)}
          </p>
        </div>
        <p className="text-sm tabular-nums text-white/45">
          Level <strong className="font-semibold text-white/75">{level}</strong>/10 · {xp} XP
          {level < 10 ? ` · ${toNext} to next` : " · max level"}
        </p>
      </div>

      <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-deep via-accent to-accent-soft transition-[width] duration-700 ease-out"
          style={{ width: `${xp}%` }}
        />
      </div>

      <div className="relative mt-3 flex justify-between">
        {Array.from({ length: 10 }, (_, i) => {
          const step = i + 1;
          const state = step < level ? "passed" : step === level ? "active" : "future";
          return (
            <span
              key={step}
              title={levelName(step)}
              className={`text-[10px] tabular-nums ${
                state === "active"
                  ? "font-semibold text-accent"
                  : state === "passed"
                    ? "text-white/45"
                    : "text-white/20"
              }`}
            >
              {step}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

/** One number and what it counts. */
export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel hover="lift" className="flex flex-col justify-between">
      <p className="relative font-serif text-[clamp(2rem,4vw,2.75rem)] leading-none tabular-nums text-white">
        {value}
      </p>
      <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 transition duration-300 group-hover:text-white/65">
        {label}
      </p>
    </Panel>
  );
}

/** Something went wrong, said once, in the site's voice. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-2xl bg-[#CF7A70]/[0.08] px-4 py-3 text-sm text-[#E0A49D] ring-1 ring-[#CF7A70]/20"
    >
      {children}
    </p>
  );
}
