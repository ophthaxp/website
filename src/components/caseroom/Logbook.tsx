"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Eyebrow, Panel, ScoreRow, XpDelta } from "./atoms";
import { TIER_COLOR, gradedMetrics, relativeDay, xpSeries } from "./scoring";
import type { HistoryEntry } from "./types";

/**
 * The logbook: what this doctor has worked, and how it went.
 *
 * A row is closed by default and opens onto the scores and the case recap.
 *
 * The closed row carries the title and one quiet meta line, and nothing else.
 * It used to carry two ringed pills, an XP figure and a chevron down the right
 * of a two-line block — fine once, unreadable eight times over. A column of
 * outcomes should be scannable down one edge, not decoded row by row, so the
 * verdict is a coloured dot at the head of the line and a single coloured word
 * beneath it. Everything else waits for a click.
 */

/** The colour a verdict is drawn in — the score tiers, so the panel agrees with itself. */
function verdictColor(correct: boolean): string {
  return correct ? TIER_COLOR.good : TIER_COLOR.bad;
}

function Sep() {
  return <span aria-hidden className="text-white/20">·</span>;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-white/70">{value}</dd>
    </div>
  );
}

function LogbookRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);

  const delta = entry.after - entry.before;
  const metrics = gradedMetrics(entry);
  // Nothing to expand onto for an attempt saved before scoring existed. The row
  // stays a row rather than becoming a button that opens an empty drawer.
  const hasDetail =
    metrics.length > 0 ||
    typeof entry.overall === "number" ||
    Boolean(entry.presenting_complaint) ||
    Boolean(entry.headline);

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className="group/row flex w-full items-center gap-3.5 py-4 text-left transition disabled:cursor-default sm:gap-4"
      >
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full transition duration-300 group-hover/row:scale-125"
          style={{ background: verdictColor(entry.correct) }}
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-white/90">{entry.title}</span>

          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-white/40">
            <span style={{ color: verdictColor(entry.correct) }}>
              {entry.correct ? "Correct" : "Incorrect"}
            </span>
            <Sep />
            <span>{relativeDay(entry.date)}</span>
            {entry.reasoning_quality ? (
              <>
                <Sep />
                <span className="capitalize">{entry.reasoning_quality} reasoning</span>
              </>
            ) : null}
            {typeof entry.overall === "number" ? (
              <>
                <Sep />
                <span className="tabular-nums">{entry.overall}/10</span>
              </>
            ) : null}
          </span>
        </span>

        <XpDelta delta={delta} className="shrink-0 text-right text-[13px]" />

        {hasDetail ? (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/30 transition duration-200 group-hover/row:text-accent ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
      </button>

      {open ? (
        <div className="animate-fadeIn grid gap-5 pb-6 pl-[1.375rem] pr-1">
          {entry.headline ? (
            <p className="text-sm leading-relaxed text-white/75">{entry.headline}</p>
          ) : null}

          {/* The same rings the debrief uses, at the same sizes — a doctor
              reading a case back should see the shape they were shown when they
              finished it, not a second way of drawing the same six numbers. */}
          {metrics.length > 0 || typeof entry.overall === "number" ? (
            <div className="border-t border-white/[0.06] pt-6">
              <ScoreRow overall={entry.overall} metrics={metrics} />
            </div>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            {entry.presenting_complaint ? (
              <div className="sm:col-span-2">
                <SummaryRow label="The case" value={entry.presenting_complaint} />
              </div>
            ) : null}
            {/* Answer and attempt side by side: comparing the two is the reason
                a doctor opens a row whose verdict they already know. */}
            {entry.correct_diagnosis ? (
              <SummaryRow label="Answer" value={entry.correct_diagnosis} />
            ) : null}
            {entry.final_diagnosis ? (
              <SummaryRow label="You said" value={entry.final_diagnosis} />
            ) : null}
            {entry.final_reasoning ? (
              <div className="sm:col-span-2">
                <SummaryRow label="Your reasoning" value={entry.final_reasoning} />
              </div>
            ) : null}
          </dl>

          {entry.note ? (
            <p className="border-l-2 border-accent/40 pl-4 text-sm italic leading-relaxed text-white/55">
              {entry.note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * XP over time.
 *
 * Hand-drawn SVG rather than a chart library: it is one line on a fixed 0–100
 * scale with no axes to negotiate, and pulling in a charting dependency for it
 * would cost more than it draws.
 *
 * It scales proportionally now. Stretched to fill its container it drew ovals
 * where the points should have been — `preserveAspectRatio="none"` warps the
 * geometry as well as the layout, and this panel is wider than the box is.
 */
function ProgressChart({ history }: { history: HistoryEntry[] }) {
  const values = xpSeries(history);

  // One reading is a dot, not a line. `xpSeries` seeds the series with the XP a
  // doctor held before their first case, so this only shows before any case.
  if (values.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-white/40">
        Complete a case to start plotting your progress.
      </p>
    );
  }

  const width = 640;
  const height = 210;
  const padL = 34;
  const padR = 12;
  const padTop = 16;
  const padBottom = 26;

  const toX = (i: number) => padL + (i / (values.length - 1)) * (width - padL - padR);
  const toY = (xp: number) => padTop + (1 - xp / 100) * (height - padTop - padBottom);

  const line = values.map((xp, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(xp)}`).join(" ");
  // Closed back along the baseline so the area under the line can be washed —
  // the line alone on a black panel reads as thin and unanchored.
  const base = toY(0);
  const area = `${line} L ${toX(values.length - 1)} ${base} L ${toX(0)} ${base} Z`;

  const last = values[values.length - 1];
  const cases = values.length - 1;
  // Past a certain density the dots stop marking cases and start thickening the
  // line, so beyond it only the ends are marked.
  const dotted = values.length <= 24;

  return (
    <div className="py-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Experience over ${cases} case${cases === 1 ? "" : "s"}, now ${last} XP`}
      >
        <defs>
          <linearGradient id="caseroom-xp-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B75A44" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#B75A44" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Three gridlines, each labelled. Five unlabelled ones were decoration:
            a reader could see the line was high without knowing high of what. */}
        {[0, 50, 100].map((gridline) => (
          <g key={gridline}>
            <line
              x1={padL}
              x2={width - padR}
              y1={toY(gridline)}
              y2={toY(gridline)}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
            <text
              x={padL - 9}
              y={toY(gridline) + 4}
              textAnchor="end"
              fontSize={11}
              fill="rgba(255,255,255,0.3)"
            >
              {gridline}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#caseroom-xp-wash)" />
        <path
          d={line}
          fill="none"
          stroke="#B75A44"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {dotted
          ? values.map((xp, i) => <circle key={i} cx={toX(i)} cy={toY(xp)} r={2.5} fill="#C87862" />)
          : null}

        {/* Where they stand now, marked and read out. */}
        <circle cx={toX(values.length - 1)} cy={toY(last)} r={4} fill="#B75A44" />
        <circle
          cx={toX(values.length - 1)}
          cy={toY(last)}
          r={7.5}
          fill="none"
          stroke="#B75A44"
          strokeOpacity={0.35}
        />

        <text x={padL} y={height - 6} fontSize={11} fill="rgba(255,255,255,0.3)">
          Started
        </text>
        <text
          x={width - padR}
          y={height - 6}
          textAnchor="end"
          fontSize={11}
          fill="rgba(255,255,255,0.45)"
        >
          {last} XP now
        </text>
      </svg>
    </div>
  );
}

/**
 * Recent cases and the progress line, as two tabs.
 *
 * The standalone app slid between them in a carousel with arrows and dots. Two
 * panels do not need a carousel — tabs say what is behind them, which arrows do
 * not, and they are reachable from the keyboard without any work.
 */
export function Logbook({ history }: { history: HistoryEntry[] }) {
  const [tab, setTab] = useState<"recent" | "progress">("recent");
  const [showAll, setShowAll] = useState(false);

  const tabs = [
    { id: "recent" as const, label: "Recent" },
    { id: "progress" as const, label: "Progress" },
  ];

  const shown = showAll ? history : history.slice(0, 8);

  return (
    <Panel hover="glow" className="sm:p-8">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Your logbook</Eyebrow>
          <p className="mt-1.5 text-[13px] tabular-nums text-white/35">
            {history.length === 0
              ? "Nothing logged yet"
              : `${history.length} case${history.length === 1 ? "" : "s"} logged`}
          </p>
        </div>

        <div className="flex gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                tab === item.id ? "bg-accent/15 text-accent" : "text-white/45 hover:text-white/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5">
        {tab === "recent" ? (
          history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-serif text-lg text-white/70">No cases yet</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/40">
                Your first workup will show up here, with the scores and the attending&rsquo;s note.
              </p>
            </div>
          ) : (
            <>
              <div className="-mt-2">
                {shown.map((entry) => (
                  <LogbookRow key={entry.id} entry={entry} />
                ))}
              </div>

              {/* A logbook that quietly stops at eight is a logbook with its
                  older half missing, which is the half worth looking back at. */}
              {history.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-4 text-[13px] font-medium text-white/45 transition hover:text-accent"
                >
                  {showAll ? "Show recent only" : `Show all ${history.length} cases`}
                </button>
              ) : null}
            </>
          )
        ) : (
          <ProgressChart history={history} />
        )}
      </div>
    </Panel>
  );
}
