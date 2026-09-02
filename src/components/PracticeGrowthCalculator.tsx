"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Info,
  Loader2,
  LocateFixed,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { RoiSignupGate, type RoiQuota } from "@/components/RoiSignupGate";
import { CatchmentMap, type CatchmentPoint } from "./CatchmentMap";

interface Specialization {
  slug: string;
  label: string;
  avgSellingPriceInr: number;
  prevalencePct: number;
  factsBlurb: string | null;
}

/** Compact km2 label: one decimal below 10 so small circles don't read as "3". */
function formatSqKm(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  });
}

/** One row of the location typeahead — a place name and the pincode behind it. */
interface PlaceSuggestion {
  pincode: string;
  place: string;
  officeName: string;
  population: number;
  matchedOn: "place" | "pincode";
}

interface PincodeLookup {
  pincode: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  region?: string | null;
  populationPerSqKm: number;
  areaSqKm?: number | null;
}

/** One pincode's share of the radius — what the "Additional Geographical Info" table shows. */
interface CatchmentContribution {
  pincode: string;
  office: string;
  /** Centre-to-centre; a large pincode can sit further away than the radius and still reach in. */
  distanceKm: number;
  /** Share of that pincode's PEOPLE inside the circle, not the share of its area. */
  exposurePct: number;
  totalPop: number;
  inCirclePop: number;
  /** Pincode centroid — the point distanceKm is measured to, and where the map
      plots it. Absent on an older backend, so the map filters for it. */
  lat?: number;
  lon?: number;
}

interface RoiResult {
  specialization: { slug: string; label: string };
  pincode: string;
  city: string | null;
  region: string | null;
  radiusKm: number;
  expectedPatients: number;
  serviceablePopulation: number;
  serviceablePopulationSource?: "catchment" | "density";
  pincodesInRadius?: number;
  breakdown?: CatchmentContribution[];
  /** Where the circle was centred: the population-weighted centroid, not the
      pincode's geometric centre. */
  center?: { lat: number; lon: number };
  prevalencePct: number;
  prevalenceCount: number;
  avgSellingPriceInr: number;
  projectedRevenue: number;
  impactPct: number;
  stature: string;
}

/** Fallback list used when the backend is unreachable — keeps the UI usable in dev. */
const FALLBACK_SPECIALIZATIONS: Specialization[] = [
  {
    slug: "cataract",
    label: "Cataract",
    avgSellingPriceInr: 50_000,
    prevalencePct: 10,
    factsBlurb:
      "Cataract is India's leading cause of blindness — over 9 million affected.",
  },
  {
    slug: "glaucoma",
    label: "Glaucoma",
    avgSellingPriceInr: 16_000,
    prevalencePct: 10,
    factsBlurb:
      "Over 11 million Indian adults live with glaucoma, sustaining steady demand for care.",
  },
  {
    slug: "phaco-refractive-surgery",
    label: "Phaco & Refractive Surgery",
    avgSellingPriceInr: 65_000,
    prevalencePct: 12,
    factsBlurb:
      "Cataract + refractive correction drive year-round volume across India.",
  },
];

// India Post tags every office with its type — S.O (sub office), H.O (head office),
// B.O (branch office), G.P.O, P.O. That is postal-network vocabulary, not part of the
// place name, so it is noise in a list of areas: "Karinkal S.O" is just Karinkal.
// Matched as a whole token only, and on the boundary rather than a lookbehind, which
// Safari below 16.4 rejects at parse time — a crash, not a missed match.
const POST_OFFICE_CODE = /(^|[\s,])(?:[BSHP]\.?O\.?|G\.?P\.?O\.?)(?=[\s,]|$)/gi;

/** Drop the India Post office-type code from a place name, for display only. */
function cleanAreaName(raw: string): string {
  const out = raw
    .replace(POST_OFFICE_CODE, "$1")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "");
  // Verified against all 19,312 names in pincode-geo.csv: none reduce to nothing.
  // The fallback is here so a future data quirk shows the raw name, never a blank cell.
  return out || raw;
}

/**
 * Coverage at the precision the table prints it, so rows that read the same
 * sort as the same. Without this, four rows all showing "100%" come back in an
 * order set by hundredths the reader cannot see — which looks like no sort ran.
 */
function shownCoverage(c: CatchmentContribution): number {
  return c.exposurePct >= 99.95 ? 100 : Math.round(c.exposurePct * 10) / 10;
}

/**
 * How the per-pincode rows can be ordered. Every question a reader actually has
 * of that table is a sort: which neighbour brings the most people, what the
 * radius only clips, how far it really reaches. Coverage ties break on
 * head-count, so equal bands lead with the pincodes that matter most.
 */
type Row = CatchmentContribution;
const COVERAGE_SORTS = [
  { key: "distance-asc", label: "Nearest first", compare: (a: Row, b: Row) => a.distanceKm - b.distanceKm },
  { key: "distance-desc", label: "Farthest first", compare: (a: Row, b: Row) => b.distanceKm - a.distanceKm },
  { key: "people-desc", label: "Most people", compare: (a: Row, b: Row) => b.inCirclePop - a.inCirclePop },
  { key: "people-asc", label: "Fewest people", compare: (a: Row, b: Row) => a.inCirclePop - b.inCirclePop },
  { key: "coverage-desc", label: "Highest coverage", compare: (a: Row, b: Row) => shownCoverage(b) - shownCoverage(a) || b.inCirclePop - a.inCirclePop },
  { key: "coverage-asc", label: "Lowest coverage", compare: (a: Row, b: Row) => shownCoverage(a) - shownCoverage(b) || b.inCirclePop - a.inCirclePop },
] as const;

type CoverageSortKey = (typeof COVERAGE_SORTS)[number]["key"];

/** Compact head-count for the suggestion rows: 1.4 L, 2.6 Cr. */
function formatPeopleShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatINRShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "₹0";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-IN");
}

/**
 * The ROI endpoints proxy a separate service, so a transport failure arrives
 * here as its raw Node error string ("read ECONNRESET", "fetch failed"). Those
 * say nothing to a surgeon sizing up a catchment — swap them for the one thing
 * that is actually true and actionable.
 */
function friendlyError(raw: string | null | undefined): string {
  const msg = (raw ?? "").trim();
  if (!msg) return "Something went wrong. Try again.";
  if (/ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|socket hang up|network/i.test(msg)) {
    return "Population data is unavailable right now. Try again in a moment.";
  }
  return msg;
}

/* ── presentational pieces of the ROI panel ───────────────────────────────
   Declared at module scope on purpose: defined inside the component they
   would be a fresh type on every render, so React would unmount and remount
   each slider mid-drag instead of updating it. */

/** Label + value chip that sits above every slider. */
function Field({
  htmlFor,
  label,
  hint,
  value,
}: {
  htmlFor: string;
  label: string;
  hint: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="inline-flex items-center gap-2 text-[14px] text-white"
      >
        {label}
        <Info className="h-3.5 w-3.5 text-white" aria-hidden />
        <span className="sr-only">{hint}</span>
      </label>
      <span className="inline-flex h-6 items-center rounded-md bg-ink-600 px-2.5 text-[13px] font-semibold tabular-nums text-white focus-within:bg-ink-500">
        {value}
      </span>
    </div>
  );
}

/**
 * The number inside a value chip, typed as well as dragged. Keystrokes are held
 * in a draft string rather than pushed through the number on every one: parsing
 * mid-word would fight the reader ("30" is not 3 then 0 to them), and
 * reformatting under the caret would move it. The draft commits on blur or
 * Enter, and Escape throws it away.
 *
 * Only the range is enforced on what was typed, not the slider's step — someone
 * who types 3,250 means 3,250.
 */
function ValueInput({
  value,
  min,
  max,
  onChange,
  ariaLabel,
  prefix,
  suffix,
}: {
  value: number | null;
  min: number;
  max: number;
  onChange: (n: number | null) => void;
  ariaLabel: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value === null ? "" : formatNumber(value));

  const commit = (raw: string) => {
    setDraft(null);
    const digits = raw.replace(/\D/g, "");
    onChange(digits === "" ? null : Math.min(max, Math.max(min, Number(digits))));
  };

  // Sized to its own text, so the chip hugs the number as it did when it was
  // static. Commas are narrower than the tabular digits they sit between.
  const ch = Array.from(text).reduce((w, c) => w + (c === "," ? 0.42 : 1), 0);

  return (
    <>
      {prefix}
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={text}
        placeholder="—"
        // The outline is killed inline because globals.css rings every focused
        // input, and a utility class only ties on specificity with it. The chip
        // lights up instead — a ring around a number inside a chip reads as a
        // second control.
        style={{ width: `${Math.max(1, ch)}ch`, outline: "none" }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d,]/g, ""))}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        className="bg-transparent text-right font-semibold tabular-nums text-white placeholder:font-normal placeholder:text-[#6E6E6E]"
      />
      {suffix}
    </>
  );
}

/**
 * The unit beside a value chip's number — "Km", "₹" — greyed as in the Figma.
 * The rupee sign leads, as it does in prose; a measure or a count follows.
 */
function Unit({ children, side }: { children: React.ReactNode; side: "left" | "right" }) {
  return (
    <span className={`font-normal text-[#A5A5A5] ${side === "left" ? "mr-1.5" : "ml-1.5"}`}>
      {children}
    </span>
  );
}

/**
 * How hard the track's curve bends. The value is not the position: a slider
 * running to 40,000 outpatients spends most of itself on numbers nobody has,
 * while every answer a real practice would give is crushed into its first
 * centimetre. Bending it exponentially hands the low end most of the track and
 * lets the high end pass quickly — 3 is steep enough to feel, gentle enough
 * that the top still moves in useful increments.
 */
const CURVE = 3;
/** Positions per track. Fine enough that the knob lands where the pointer did. */
const STEPS = 1000;

/** Track position (0..1) to the value under it. */
function valueAt(position: number, min: number, max: number) {
  return min + (max - min) * (Math.expm1(CURVE * position) / Math.expm1(CURVE));
}

/** Value to where its knob sits (0..1). The inverse of `valueAt`. */
function positionOf(value: number, min: number, max: number) {
  const frac = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return Math.log1p(frac * Math.expm1(CURVE)) / CURVE;
}

/**
 * Native range input dressed as the Figma's track: a bar that fades out toward
 * the left, ending in a cap concentric with a white knob, over tick marks that
 * show through the part not yet covered.
 *
 * The bar and the knob are drawn as elements rather than as the input's track
 * and thumb pseudo-elements — see .roi-fill in globals.css for why the cap
 * cannot be a percentage-width background. The input itself stays on top and
 * keeps every native behaviour; only its own paint is gone.
 */
function Slider({
  id,
  min,
  max,
  step,
  value,
  onChange,
  fill,
  valueText,
}: {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number | null;
  onChange: (n: number) => void;
  fill: string;
  valueText: string;
}) {
  // A control can still be cleared back to nothing: the knob rests at the low
  // end and the bar is faded back, which reads as untouched rather than as a
  // deliberate minimum.
  const unset = value === null;
  const shown = value ?? min;
  // Rounded before it reaches an attribute: the raw double differs in its last
  // bit between the server and the browser, which React reports as a hydration
  // mismatch. Four places is finer than a pixel on any width this renders at.
  const frac = Math.round(positionOf(shown, min, max) * 10000) / 10000;

  /** Land a value on the control's own grid, inside its own range. */
  const snap = (n: number) =>
    Math.min(max, Math.max(min, min + Math.round((n - min) / step) * step));

  return (
    <div
      className="roi-slider"
      data-unset={unset || undefined}
      style={{ "--frac": frac, "--roi-fill": fill } as React.CSSProperties}
    >
      <div className="roi-ticks" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="roi-fill" aria-hidden />
      <div className="roi-thumb" aria-hidden>
        {/* Two facing arrows, the Figma's grip. */}
        <svg viewBox="0 0 18 9" className="h-[9px] w-[18px]" fill="#8B8B8B">
          <path d="M0.4 4.5 7.8 0.3V8.7Z" />
          <path d="M17.6 4.5 10.2 0.3V8.7Z" />
        </svg>
      </div>
      <input
        id={id}
        type="range"
        // The input measures the track, not the number: 0..STEPS of travel that
        // `valueAt` bends into a value. Its own value would climb in a straight
        // line, which is the thing being got rid of.
        min={0}
        max={STEPS}
        step={1}
        value={Math.round(frac * STEPS)}
        aria-valuetext={unset ? "not set" : valueText}
        onChange={(e) =>
          onChange(snap(valueAt(Number(e.target.value) / STEPS, min, max)))
        }
        // A press that lands exactly where the knob already is fires no change
        // event, so an untouched slider would stay unanswered even though the
        // reader just chose its minimum. Commit the shown value on release too.
        onPointerUp={() => onChange(shown)}
        // Keys move by the control's own step rather than by one position,
        // which at the dense end of the curve would round back to where it
        // started. Tab is not among them: moving through a control is not
        // answering it.
        onKeyDown={(e) => {
          const by =
            e.key === "ArrowRight" || e.key === "ArrowUp"
              ? step
              : e.key === "ArrowLeft" || e.key === "ArrowDown"
                ? -step
                : e.key === "PageUp"
                  ? step * 10
                  : e.key === "PageDown"
                    ? -step * 10
                    : null;
          const next =
            by !== null
              ? shown + by
              : e.key === "Home"
                ? min
                : e.key === "End"
                  ? max
                  : null;
          if (next === null) return;
          e.preventDefault();
          onChange(snap(next));
        }}
        className="roi-range"
      />
    </div>
  );
}

/**
 * The standing figure from the Figma, at its own 15×24 geometry. The two arm
 * strokes reach a hair past the box on each side; the viewport clips them, as
 * the Figma's own clip path does.
 */
const FIGURE_HEAD =
  "M5.2678 2.25C5.2678 1.6532 5.5029 1.0809 5.9216 0.659C6.3402 0.237 6.9079 0 7.4999 0C8.0919 0 8.6597 0.237 9.0783 0.659C9.4969 1.0809 9.7321 1.6532 9.7321 2.25C9.7321 2.8467 9.4969 3.419 9.0783 3.8409C8.6597 4.2629 8.0919 4.5 7.4999 4.5C6.9079 4.5 6.3402 4.2629 5.9216 3.8409C5.5029 3.419 5.2678 2.8467 5.2678 2.25Z";
const FIGURE_BODY =
  "M7.1279 16.5V22.5C7.1279 23.3296 6.4629 24 5.6398 24C4.8167 24 4.1517 23.3296 4.1517 22.5V12.0421L2.8217 14.2734C2.3985 14.9812 1.4824 15.2109 0.7802 14.7843C0.078 14.3578 -0.1498 13.4343 0.2734 12.7265L2.9845 8.1796C3.7936 6.825 5.2445 5.9953 6.8117 5.9953H8.1928C9.76 5.9953 11.2109 6.825 12.02 8.1796L14.7311 12.7265C15.1543 13.4343 14.9264 14.3578 14.2242 14.7843C13.522 15.2109 12.6059 14.9812 12.1828 14.2734L10.8481 12.0421V22.5C10.8481 23.3296 10.1831 24 9.36 24C8.5369 24 7.8719 23.3296 7.8719 22.5V16.5H7.1279Z";

/** One figure, greyed like the other units, marking a chip as a headcount. */
function PeopleUnit() {
  return (
    <span className="ml-1.5 inline-flex text-[#A5A5A5]" aria-hidden>
      <svg viewBox="0 0 15 24" className="h-[13px] w-[8.5px]" fill="currentColor">
        <path d={FIGURE_HEAD} />
        <path d={FIGURE_BODY} />
      </svg>
    </span>
  );
}

/** Ten figures, the first `filled` of them solid and the rest faded back. */
function FigureRow({ filled, tone }: { filled: number; tone: "accent" | "white" }) {
  return (
    <div className="mt-2.5 flex gap-1.5" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 15 24"
          className={`h-5 w-[13px] shrink-0 ${
            tone === "accent" ? "text-accent" : "text-white"
          } ${i < filled ? "" : "opacity-30"}`}
          fill="currentColor"
        >
          <path d={FIGURE_HEAD} />
          <path d={FIGURE_BODY} />
        </svg>
      ))}
    </div>
  );
}

/**
 * The dial face, to the Figma geometry scaled into a 234×118 box: centre
 * (117, 117), radius 105, a 20-wide band, cut flat at the centre line — which is
 * what makes the hub a half-disc and squares off the ends of the arc. Declared
 * at module scope because both the track and the reading are the same arc drawn
 * twice.
 */
const GAUGE_ARC = "M12 117A105 105 0 0 1 222 117";

/** Half-circle tick gauge for the impact figure, with the reading on its face. */
function ImpactGauge({ pct }: { pct: number }) {
  const value = Math.min(100, Math.max(0, pct));
  // Rounded before it reaches an attribute: the raw double differs in its last
  // bit between the server and the browser engines, which React reports as a
  // hydration mismatch.
  const filled = Math.round(value * 100) / 100;
  // 0% points the needle at the left end of the arc, 100% at the right end.
  const angle = Math.round((filled * 1.8 - 90) * 100) / 100;

  return (
    <div className="relative mx-auto w-full max-w-[234px]">
      <svg
        viewBox="0 0 234 118"
        className="w-full"
        role="img"
        aria-label={`${pct.toFixed(2)} percent of local burden addressed`}
      >
        {/* The ticks are one dashed path, not eighty <line> elements: a 20-wide
            band broken every 2 units is the same picture for a fraction of the
            DOM, and it stays evenly spaced at any width. */}
        <path
          d={GAUGE_ARC}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.22}
          strokeWidth={20}
          strokeDasharray="2 2"
        />
        {/* The reading, drawn solid over the ticks. pathLength renames the arc's
            length to 100, so the dash array below is literally the percentage —
            no arc-length arithmetic, and it cannot drift from the needle. */}
        <path
          d={GAUGE_ARC}
          fill="none"
          stroke="#2563EB"
          strokeWidth={20}
          pathLength={100}
          strokeDasharray={`${filled} 100`}
        />
        <circle cx="117" cy="117" r="17" fill="#FF383C" />
        <circle cx="117" cy="117" r="7.5" fill="#A5A5A5" />
        {/* Needle over the hub, as in the Figma: grey shaft, blue tip. */}
        <g transform={`rotate(${angle} 117 117)`}>
          <line
            x1="117"
            y1="112"
            x2="117"
            y2="86"
            stroke="#A5A5A5"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1="117"
            y1="92"
            x2="117"
            y2="86"
            stroke="#2563EB"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <p className="pointer-events-none absolute inset-x-0 top-[55%] -translate-y-1/2 text-center text-[clamp(1.5rem,2.4vw,1.875rem)] font-semibold tabular-nums text-white">
        {pct ? `${pct.toFixed(2)}%` : "—"}
      </p>
    </div>
  );
}

interface Props {
  defaultSpecialty?: string;
  /** Retained for backward compatibility — unused in the new ROI model. */
  courseTuitionInr?: number;
  /** Course slug used as an extra hint for prefill matching. */
  courseSlug?: string;
  /** Course name used as an extra hint for prefill matching. */
  courseName?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  lockSpecialty?: boolean;
  compact?: boolean;
  defaultPincode?: string;
  defaultRadiusKm?: number;
  defaultExpectedPatients?: number;
  /** Override the bottom CTA label. Defaults differ by mode:
   *  - link mode (no onCtaClick): "Know more"
   *  - button mode (onCtaClick set): "Speak to Legends of Medicine Concierge" */
  ctaLabel?: string;
}

/**
 * Pick the ROI specialization that best matches the course context. The course
 * taxonomy ("cornea-ocular-surface", "phaco-refractive-surgery", …) does not
 * line up 1:1 with the ROI specialization slugs from the backend ("cataract",
 * "glaucoma", …), so try exact-slug first and then fall back to substring
 * matching across the course's specialty / slug / name. Returns null when
 * nothing matches so the caller can keep its own default.
 */
function pickBestSpecMatch(
  specs: Specialization[],
  hints: { specialty?: string; courseSlug?: string; courseName?: string },
): string | null {
  if (specs.length === 0) return null;
  const haystack = [hints.specialty, hints.courseSlug, hints.courseName]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())
    .join(" ");
  if (!haystack) return null;

  const exact = specs.find(
    (s) => s.slug.toLowerCase() === hints.specialty?.toLowerCase(),
  );
  if (exact) return exact.slug;

  // Substring match in either direction — handles e.g. course slug
  // "corneal-transplant" → ROI spec "cornea", or course specialty
  // "phaco-refractive-surgery" matching itself, or label "Cataract" appearing
  // in the course name. Score by longest token hit so "cornea" beats "ear".
  let best: { slug: string; score: number } | null = null;
  for (const s of specs) {
    const slugLc = s.slug.toLowerCase();
    const labelLc = s.label.toLowerCase();
    const candidates = [slugLc, labelLc, ...slugLc.split("-"), ...labelLc.split(/\s+/)];
    for (const tok of candidates) {
      if (tok.length < 4) continue; // skip noise like "and", "of"
      if (haystack.includes(tok)) {
        const score = tok.length;
        if (!best || score > best.score) best = { slug: s.slug, score };
      }
    }
  }
  return best?.slug ?? null;
}

/**
 * What the panel opens on when the caller pre-fills nothing. A worked example
 * beats five blank controls: the reader can generate an outlook on the first
 * click and then move the sliders to their own practice, instead of having to
 * describe it before seeing anything at all.
 */
const DEFAULTS = {
  specSlug: "cataract",
  pincode: "400021",
  /** The em-dash form the place picker itself writes, so the box reads alike. */
  locationLabel: "Nariman Point — 400021",
  radiusKm: 7,
  annualOutpatients: 3_000,
  opFeeInr: 500,
  annualInpatients: 300,
  ipFeeInr: 75_000,
} as const;

export function PracticeGrowthCalculator({
  defaultSpecialty,
  courseSlug,
  courseName,
  ctaHref = "#get-started",
  onCtaClick,
  lockSpecialty = false,
  compact = false,
  defaultPincode,
  defaultRadiusKm,
  defaultExpectedPatients = 300,
  ctaLabel,
}: Props) {
  const [specs, setSpecs] = useState<Specialization[]>([]);
  // The caller wins where it has an opinion — a course page passes its own
  // specialty, which is that page's subject rather than a guess. Everything it
  // leaves out falls back to DEFAULTS, so the panel is never blank.
  const [specSlug, setSpecSlug] = useState<string>(
    defaultSpecialty ?? DEFAULTS.specSlug,
  );
  const [pincode, setPincode] = useState<string>(defaultPincode ?? DEFAULTS.pincode);
  const [radiusKm, setRadiusKm] = useState<number | null>(
    defaultRadiusKm != null ? Math.max(1, defaultRadiusKm) : DEFAULTS.radiusKm,
  );

  // Practice profile. The backend ROI model has no fee inputs, so revenue is
  // derived here from what the reader actually sets (see `projectedRevenue`
  // below); the backend still owns population and disease burden.
  //
  // These open on DEFAULTS rather than empty, so the outlook button is live on
  // arrival. Null stays meaningful: a control cleared back to nothing is still
  // "not answered", and the button shuts again until it is.
  const [annualOutpatients, setAnnualOutpatients] = useState<number | null>(
    DEFAULTS.annualOutpatients,
  );
  const [opFeeInr, setOpFeeInr] = useState<number | null>(DEFAULTS.opFeeInr);
  const [annualInpatients, setAnnualInpatients] = useState<number | null>(
    DEFAULTS.annualInpatients,
  );
  const [ipFeeInr, setIpFeeInr] = useState<number | null>(DEFAULTS.ipFeeInr);

  // What we send the backend as "patients treated". Its contract caps this at
  // 2000, so clamp rather than pass the raw annual volume and risk a 400.
  const expectedPatients = useMemo(
    () => Math.max(10, Math.min(2000, Math.round(annualInpatients ?? 0))),
    [annualInpatients],
  );

  const [pinLookup, setPinLookup] = useState<PincodeLookup | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // ─── location box: one field for a pincode OR a place name ────────────────
  // Digits keep the original behaviour (typed straight into `pincode`); letters
  // run the place typeahead, and picking a row fills `pincode` for us — so
  // everything downstream still keys off a 6-digit pincode exactly as before.
  const [locationQuery, setLocationQuery] = useState<string>(
    defaultPincode ?? DEFAULTS.locationLabel,
  );
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // The query values we wrote ourselves — the prefilled default, and the label
  // written after a pick — neither of which should open a dropdown. Held as a
  // value to compare against rather than a flag to consume, because Strict Mode
  // double-invokes the mount effect and a one-shot flag leaks the second run.
  const selfSetQuery = useRef<string>(defaultPincode ?? DEFAULTS.locationLabel);
  const locationBoxRef = useRef<HTMLDivElement | null>(null);

  const [result, setResult] = useState<RoiResult | null>(null);
  /**
   * Whether the reader has asked for an outlook yet. Before that the panel shows
   * nothing at all; after it, every control is live and recalculates on its own,
   * so the button is a starting gun rather than a submit.
   */
  const [hasGenerated, setHasGenerated] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [coverageSort, setCoverageSort] = useState<CoverageSortKey>("distance-asc");

  /**
   * The signup wall. The server owns the decision — these three only remember
   * what it last said, so the panel can show the wall and stop asking again.
   *
   * `lockedPincode` is why the second one exists: while the wall is up for a
   * location, every slider nudge would otherwise fire another request that is
   * certain to be refused. Holding the location it applies to lets a control
   * change be ignored outright while a NEW location still gets asked about.
   */
  const [lockedReason, setLockedReason] = useState<
    "pincodes" | "controlChanges" | null
  >(null);
  const [lockedPincode, setLockedPincode] = useState<string | null>(null);
  const [quota, setQuota] = useState<RoiQuota | null>(null);

  // ─── load specializations once ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/roi/specializations", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        const list: Specialization[] =
          body?.success && Array.isArray(body.data) && body.data.length > 0
            ? body.data
            : FALLBACK_SPECIALIZATIONS;
        setSpecs(list);
        // Prefer the explicit defaultSpecialty when it's a real ROI slug;
        // otherwise fuzzy-match the broader course context (slug + name) so
        // course pages prefill the closest specialization instead of always
        // falling back to the first item in the list.
        // Only when the seeded slug is not one the server actually offers —
        // otherwise the default stands.
        if (!list.some((s) => s.slug === specSlug)) {
          const match = pickBestSpecMatch(list, {
            specialty: defaultSpecialty,
            courseSlug,
            courseName,
          });
          setSpecSlug(match ?? list[0].slug);
        }
      } catch {
        if (cancelled) return;
        setSpecs(FALLBACK_SPECIALIZATIONS);
        if (!FALLBACK_SPECIALIZATIONS.some((s) => s.slug === specSlug)) {
          const match = pickBestSpecMatch(FALLBACK_SPECIALIZATIONS, {
            specialty: defaultSpecialty,
            courseSlug,
            courseName,
          });
          setSpecSlug(match ?? FALLBACK_SPECIALIZATIONS[0].slug);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // We only want this on mount; specSlug seed is consumed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── place typeahead (debounced) ──────────────────────────────────────────
  useEffect(() => {
    const q = locationQuery.trim();

    // A digits-only entry is a pincode being typed: feed it straight through so
    // the six-digit path behaves exactly as it did before this box existed.
    if (/^\d+$/.test(q)) setPincode(q.slice(0, 6));

    if (q === selfSetQuery.current) return;
    if (q.length < 2) {
      setPlaces([]);
      setPlacesOpen(false);
      setHighlight(-1);
      return;
    }

    let cancelled = false;
    setPlacesLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/roi/places?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled) return;
        const list: PlaceSuggestion[] =
          body?.success && Array.isArray(body.data) ? body.data : [];
        setPlaces(list);
        setHighlight(list.length > 0 ? 0 : -1);
        setPlacesOpen(list.length > 0);
      } catch {
        if (cancelled) return;
        setPlaces([]);
        setPlacesOpen(false);
        setHighlight(-1);
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [locationQuery]);

  // Clicking anywhere outside the box dismisses the list.
  useEffect(() => {
    if (!placesOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!locationBoxRef.current?.contains(e.target as Node)) setPlacesOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [placesOpen]);

  /** Take the pincode off the chosen row and hand it to the existing flow. */
  const selectPlace = useCallback((s: PlaceSuggestion) => {
    const label = `${s.place} — ${s.pincode}`;
    selfSetQuery.current = label;
    setLocationQuery(label);
    setPincode(s.pincode);
    setPlaces([]);
    setPlacesOpen(false);
    setHighlight(-1);
  }, []);

  const onLocationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setPlacesOpen(false);
        return;
      }
      if (places.length === 0) return;
      if (!placesOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setPlacesOpen(true);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % places.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + places.length) % places.length);
      } else if (e.key === "Enter" && highlight >= 0) {
        e.preventDefault();
        selectPlace(places[highlight]);
      }
    },
    [places, placesOpen, highlight, selectPlace],
  );

  // ─── pincode lookup (debounced) ───────────────────────────────────────────
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setPinLookup(null);
      setPinError(pincode ? "Enter a valid 6-digit pincode" : null);
      return;
    }
    let cancelled = false;
    setPinLoading(true);
    setPinError(null);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/roi/pincode/${pincode}`, { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (body?.success && body.data) {
          setPinLookup(body.data as PincodeLookup);
        } else {
          setPinLookup(null);
          setPinError(body?.error ? friendlyError(body.error) : "Pincode not found");
        }
      } catch (err) {
        if (cancelled) return;
        setPinLookup(null);
        setPinError(friendlyError(err instanceof Error ? err.message : "Pincode lookup failed"));
      } finally {
        if (!cancelled) setPinLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [pincode]);

  // ─── ROI calculation (debounced; depends on all inputs) ───────────────────
  const computeRoi = useCallback(async () => {
    if (!specSlug || !/^\d{6}$/.test(pincode) || !pinLookup || radiusKm === null) {
      setResult(null);
      return;
    }
    // Already walled on this exact location: the answer will not change, so
    // spend nothing. Moving to a different location clears this below and asks
    // again, because the reason may not apply there.
    if (lockedReason && lockedPincode === pincode) return;

    setCalcLoading(true);
    setCalcError(null);
    try {
      const res = await fetch("/api/roi/calculate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          specializationSlug: specSlug,
          pincode,
          radiusKm,
          expectedPatients,
        }),
      });
      const body = await res.json();

      // The free allowance is used up. The last result stays on screen behind
      // the wall rather than being cleared — what they have already been shown
      // is theirs, and a blank panel would read as a failure instead of a limit.
      if (body?.locked) {
        setLockedReason(body.reason ?? "pincodes");
        setLockedPincode(pincode);
        if (body.quota) setQuota(body.quota as RoiQuota);
        setCalcError(null);
        return;
      }

      if (body?.success && body.data) {
        setResult(body.data as RoiResult);
        setLockedReason(null);
        setLockedPincode(null);
        if (body.quota) setQuota(body.quota as RoiQuota);
      } else {
        setResult(null);
        setCalcError(friendlyError(body?.error || "Calculation failed"));
      }
    } catch (err) {
      setResult(null);
      setCalcError(friendlyError(err instanceof Error ? err.message : "Calculation failed"));
    } finally {
      setCalcLoading(false);
    }
  }, [specSlug, pincode, pinLookup, radiusKm, expectedPatients, lockedReason, lockedPincode]);

  // A different location is a different question, so let it be asked. Without
  // this the guard above would keep refusing to call for a location the server
  // never ruled on.
  useEffect(() => {
    if (lockedPincode && lockedPincode !== pincode) {
      setLockedReason(null);
      setLockedPincode(null);
    }
  }, [pincode, lockedPincode]);

  const calcTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!hasGenerated) return;
    if (calcTimer.current) window.clearTimeout(calcTimer.current);
    calcTimer.current = window.setTimeout(computeRoi, 250);
    return () => {
      if (calcTimer.current) window.clearTimeout(calcTimer.current);
    };
  }, [computeRoi, hasGenerated]);

  /** Everything the outlook is built from, in the order the panel asks for it.
      Nothing is pre-filled, so the button waits for all of it — a projection
      from half a practice profile would be a number the reader never gave. */
  const missing: string[] = [];
  if (!specSlug) missing.push("a specialization");
  if (!/^\d{6}$/.test(pincode)) missing.push("a location");
  if (radiusKm === null) missing.push("a radius");
  if (
    annualOutpatients === null ||
    opFeeInr === null ||
    annualInpatients === null ||
    ipFeeInr === null
  ) {
    missing.push("your volume and fees");
  }
  /** Enough to compute with. The pincode lookup can still be in flight — the
      effect above re-runs when it lands, so the first result arrives either way. */
  const canGenerate = missing.length === 0;
  /** The map only exists once there is a real catchment behind it. */
  const showMap = hasGenerated && result !== null;

  const activeSpec = useMemo(
    () => specs.find((s) => s.slug === specSlug) ?? null,
    [specs, specSlug],
  );

  // Area of the serviceable circle (pi * r^2), shown live while dragging.
  const areaSqKm = useMemo(
    () => (radiusKm === null ? 0 : Math.PI * radiusKm * radiusKm),
    [radiusKm],
  );
  const areaLabel = useMemo(
    () => (radiusKm === null ? null : formatSqKm(areaSqKm)),
    [radiusKm, areaSqKm],
  );

  // The pincode's own footprint, which the radius circle may be smaller or
  // larger than. Null when the backend has no boundary polygon for it.
  const pincodeAreaSqKm = pinLookup?.areaSqKm ?? null;
  const pincodeAreaLabel =
    pincodeAreaSqKm !== null ? formatSqKm(pincodeAreaSqKm) : null;

  // ─── derived display values (use backend result when present) ─────────────
  const serviceablePopulation = result?.serviceablePopulation ?? 0;
  const prevalenceCount = result?.prevalenceCount ?? 0;

  // Revenue and impact are computed from the four practice-profile inputs
  // rather than read off the result: the backend prices a single "patients
  // treated" figure at one average selling price and has no notion of an
  // OP/IP split, so it cannot answer what the reader is being asked here.
  const projectedRevenue = useMemo(
    () =>
      (annualOutpatients ?? 0) * (opFeeInr ?? 0) +
      (annualInpatients ?? 0) * (ipFeeInr ?? 0),
    [annualOutpatients, opFeeInr, annualInpatients, ipFeeInr],
  );

  /** Share of the local disease burden this practice volume could reach. */
  const impactPct = useMemo(() => {
    if (!prevalenceCount) return 0;
    const treated = (annualOutpatients ?? 0) + (annualInpatients ?? 0);
    return Math.min(100, (treated / prevalenceCount) * 100);
  }, [prevalenceCount, annualOutpatients, annualInpatients]);

  /** Figures in the burden row, one per ~2% of the catchment. */
  const burdenFigures = useMemo(() => {
    if (!serviceablePopulation || !prevalenceCount) return 0;
    const pct = (prevalenceCount / serviceablePopulation) * 100;
    return Math.max(1, Math.min(10, Math.round(pct / 2)));
  }, [prevalenceCount, serviceablePopulation]);

  // ─── additional geographical info ─────────────────────────────────────────
  // The radius rarely stops at the pincode boundary: it clips neighbours, and it may
  // not even cover all of the pincode it starts in. The backend already returns that
  // split per pincode, so show it rather than leave one aggregate number to be
  // taken on trust.
  const coverage = useMemo(() => result?.breakdown ?? [], [result]);
  const coverageOthers = coverage.filter((c) => c.pincode !== result?.pincode).length;
  // No breakdown means the catchment found no grid cells and the backend fell back to
  // area x density. Say so rather than hide the section: the headline number changes
  // meaning, and silently dropping the panel just looks like a bug.
  const densityFallback =
    !coverage.length && result?.serviceablePopulationSource === "density";
  const coverageSummary = densityFallback
    ? "Estimated by area × density — no grid cells in this radius"
    : !coverage.length
      ? null
      : coverageOthers === 0
        ? `Stays inside ${result?.pincode} — no neighbouring pincode is touched`
        : `Reaches ${coverageOthers} other pincode${coverageOthers === 1 ? "" : "s"} ` +
          `beyond ${result?.pincode}`;

  // The rows in whatever order the reader picked. Sorted off a copy — the array
  // is the backend result itself, and sorting in place would mutate state.
  const sortedCoverage = useMemo(() => {
    const chosen = COVERAGE_SORTS.find((s) => s.key === coverageSort) ?? COVERAGE_SORTS[0];
    return [...coverage].sort(chosen.compare);
  }, [coverage, coverageSort]);

  /**
   * Where the map draws the circle. The backend's own centre when it sends one —
   * the population-weighted centroid it actually measured from, which for a big
   * or scattered pincode is nowhere near the geometric middle. The home row's
   * coordinate is the same point, and stands in on an older backend.
   */
  const mapCenter = useMemo(() => {
    if (result?.center) return result.center;
    const home = coverage.find((c) => c.pincode === result?.pincode);
    return home?.lat != null && home?.lon != null ? { lat: home.lat, lon: home.lon } : null;
  }, [result, coverage]);

  /** The pincodes the map can plot: whichever rows came back with coordinates. */
  const mapPoints = useMemo<CatchmentPoint[]>(
    () =>
      coverage
        .filter((c): c is CatchmentContribution & { lat: number; lon: number } =>
          c.lat != null && c.lon != null,
        )
        .map((c) => ({
          pincode: c.pincode,
          label: c.office ? cleanAreaName(c.office) : c.pincode,
          lat: c.lat,
          lon: c.lon,
          exposurePct: c.exposurePct,
          people: formatPeopleShort(c.inCirclePop),
          peopleCount: c.inCirclePop,
          isHome: c.pincode === result?.pincode,
        })),
    [coverage, result?.pincode],
  );

  const regionLabel =
    pinLookup?.city ||
    pinLookup?.district ||
    pinLookup?.region ||
    result?.region ||
    "";


  const placeLabel = [pinLookup?.city, pinLookup?.district, pinLookup?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-labelledby="growth-title"
      className={
        compact
          ? "h-full overflow-hidden rounded-xl bg-ink-800"
          : "overflow-hidden rounded-[16px] bg-ink-800"
      }
    >
      <h2 id="growth-title" className="sr-only">
        Estimate your practice growth
      </h2>

      <div className="grid lg:grid-cols-[372px_minmax(0,1fr)]">
        {/* ─────────── LEFT: practice profile ─────────── */}
        <div className="space-y-2.5 border-b border-white/[0.07] px-5 py-3.5 lg:border-b-0 lg:border-r">
          {/* Specialization */}
          <div>
            <label
              htmlFor="growth-specialty"
              className="inline-flex items-center gap-2 text-[14px] text-white"
            >
              Specialization
              <Info className="h-3.5 w-3.5 text-white" aria-hidden />
            </label>
            <div className="relative mt-2">
              <select
                id="growth-specialty"
                value={specSlug}
                onChange={(e) => setSpecSlug(e.target.value)}
                disabled={lockSpecialty || specs.length === 0}
                aria-readonly={lockSpecialty}
                className={`h-[40px] w-full appearance-none rounded-[8.5px] border border-[#4A4A4A] bg-ink-600 px-4 pr-10 text-[14px] font-medium text-white outline-none transition focus:ring-2 focus:ring-accent ${
                  lockSpecialty ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                }`}
              >
                {/* Disabled so it shows while nothing is chosen but cannot be
                    chosen back into — there is no such thing as "no specialty". */}
                <option value="" disabled className="bg-ink-800">
                  Select a specialization
                </option>
                {specs.map((s) => (
                  <option key={s.slug} value={s.slug} className="bg-ink-800">
                    {s.label}
                  </option>
                ))}
              </select>
              {!lockSpecialty ? (
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
                />
              ) : null}
            </div>
          </div>

          {/* Practice location */}
          <div>
            <label
              htmlFor="growth-location"
              className="inline-flex items-center gap-2 text-[14px] text-white"
            >
              Practice Location
              <Info className="h-3.5 w-3.5 text-white" aria-hidden />
            </label>
            <div ref={locationBoxRef} className="relative mt-2">
              <input
                id="growth-location"
                type="text"
                role="combobox"
                aria-expanded={placesOpen}
                aria-controls="growth-location-list"
                aria-autocomplete="list"
                aria-activedescendant={
                  placesOpen && highlight >= 0
                    ? `growth-location-opt-${highlight}`
                    : undefined
                }
                autoComplete="off"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value.slice(0, 60))}
                onKeyDown={onLocationKeyDown}
                onFocus={(e) => {
                  // A picked place reads "Anna Nagar — 600040"; select it so the
                  // next keystroke starts a fresh search instead of editing it.
                  if (/[^\d\s]/.test(e.currentTarget.value)) e.currentTarget.select();
                  if (places.length > 0) setPlacesOpen(true);
                }}
                placeholder="e.g. 560102 or Whitefield"
                className="h-[40px] w-full rounded-[8.5px] border border-[#4A4A4A] bg-ink-600 px-4 pr-11 text-[14px] font-medium text-white outline-none transition placeholder:text-white/40 focus:ring-2 focus:ring-accent"
              />
              <LocateFixed
                aria-hidden
                className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/70"
              />

              {placesOpen && places.length > 0 && (
                <ul
                  id="growth-location-list"
                  role="listbox"
                  aria-label="Matching places"
                  className="no-scrollbar absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-accent/40 bg-ink-850 py-1 shadow-2xl shadow-black/60"
                >
                  {places.map((s, i) => {
                    const isActive = i === highlight;
                    return (
                      <li
                        key={`${s.pincode}-${s.place}`}
                        id={`growth-location-opt-${i}`}
                        role="option"
                        aria-selected={s.pincode === pincode}
                        onMouseEnter={() => setHighlight(i)}
                        onMouseDown={(e) => {
                          // Commit on mousedown, before the input can blur.
                          e.preventDefault();
                          selectPlace(s);
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition ${
                          isActive ? "bg-accent text-white" : "text-white/85 hover:bg-accent/10"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{s.place}</span>
                          <span
                            className={`block text-[11px] ${
                              isActive ? "text-white/75" : "text-white/45"
                            }`}
                          >
                            {formatPeopleShort(s.population)} people
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">
                          {s.pincode}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="mt-1.5 min-h-[1.125rem] text-[13px]">
              {placesLoading ? (
                <span className="text-white/45">Searching places…</span>
              ) : pinLoading ? (
                <span className="text-white/45">Looking up pincode…</span>
              ) : pinError ? (
                <span className="text-red-300">{pinError}</span>
              ) : placeLabel ? (
                <span className="text-[#A5A5A5]">{placeLabel}</span>
              ) : null}
            </p>
          </div>

          {/* Service radius — blue track, the one geographic control. */}
          <div>
            <Field
              htmlFor="growth-radius"
              label="Service Radius"
              hint={
                areaLabel
                  ? `Covers about ${areaLabel} square kilometres`
                  : "How far from your practice you expect to draw patients"
              }
              value={
                <ValueInput
                  value={radiusKm}
                  min={1}
                  max={100}
                  onChange={setRadiusKm}
                  ariaLabel="Service radius in kilometres"
                  suffix={<Unit side="right">Km</Unit>}
                />
              }
            />
            <Slider
              id="growth-radius"
              min={1}
              max={100}
              step={1}
              value={radiusKm}
              onChange={setRadiusKm}
              fill="#297DEA"
              valueText={`${radiusKm} kilometres, ${areaLabel ?? "—"} square kilometres`}
            />
          </div>

          {/* The Figma cuts the column into three: where the practice is, what
              its outpatients bring, what its inpatients bring. */}
          <hr className="border-t border-[#4A4A4A]" />

          {/* Practice volume + pricing */}
          <div>
            <Field
              htmlFor="growth-op"
              label="Annual Outpatients"
              hint="Consultations you expect to see in a year"
              value={
                <ValueInput
                  value={annualOutpatients}
                  min={0}
                  max={40000}
                  onChange={setAnnualOutpatients}
                  ariaLabel="Annual outpatients"
                  suffix={<PeopleUnit />}
                />
              }
            />
            <Slider
              id="growth-op"
              min={0}
              max={40000}
              step={500}
              value={annualOutpatients}
              onChange={setAnnualOutpatients}
              fill="rgba(183,90,68,0.8)"
              valueText={`${formatNumber(annualOutpatients ?? 0)} outpatients a year`}
            />
          </div>

          <div>
            <Field
              htmlFor="growth-op-fee"
              label="Op Average Fee"
              hint="Average consultation fee"
              value={
                <ValueInput
                  value={opFeeInr}
                  min={0}
                  max={5000}
                  onChange={setOpFeeInr}
                  ariaLabel="Average consultation fee in rupees"
                  prefix={<Unit side="left">₹</Unit>}
                />
              }
            />
            <Slider
              id="growth-op-fee"
              min={0}
              max={5000}
              step={50}
              value={opFeeInr}
              onChange={setOpFeeInr}
              fill="rgba(183,90,68,0.8)"
              valueText={`${formatNumber(opFeeInr ?? 0)} rupees per consultation`}
            />
          </div>

          {/* The Figma cuts the column into three: where the practice is, what
              its outpatients bring, what its inpatients bring. */}
          <hr className="border-t border-[#4A4A4A]" />

          <div>
            <Field
              htmlFor="growth-ip"
              label="Annual Inpatients"
              hint="Admissions or procedures you expect in a year"
              value={
                <ValueInput
                  value={annualInpatients}
                  min={0}
                  max={20000}
                  onChange={setAnnualInpatients}
                  ariaLabel="Annual inpatients"
                  suffix={<PeopleUnit />}
                />
              }
            />
            <Slider
              id="growth-ip"
              min={0}
              max={20000}
              step={100}
              value={annualInpatients}
              onChange={setAnnualInpatients}
              fill="rgba(183,90,68,0.8)"
              valueText={`${formatNumber(annualInpatients ?? 0)} inpatients a year`}
            />
          </div>

          <div>
            <Field
              htmlFor="growth-ip-fee"
              label="Ip Average Fee"
              hint="Average realisation per admission or procedure"
              value={
                <ValueInput
                  value={ipFeeInr}
                  min={0}
                  max={200000}
                  onChange={setIpFeeInr}
                  ariaLabel="Average realisation per admission in rupees"
                  prefix={<Unit side="left">₹</Unit>}
                />
              }
            />
            <Slider
              id="growth-ip-fee"
              min={0}
              max={200000}
              step={1000}
              value={ipFeeInr}
              onChange={setIpFeeInr}
              fill="rgba(183,90,68,0.8)"
              valueText={`${formatNumber(ipFeeInr ?? 0)} rupees per admission`}
            />
          </div>

          {/* Opens the panel up the first time. Afterwards every control is live,
              so this becomes a way to re-run rather than the only way to see
              anything — which is why it stays enabled and does not change label. */}
          <button
            type="button"
            onClick={() => {
              // The first click only arms the effect above, which then runs the
              // calculation — calling it here as well would fire two identical
              // requests. Once armed the effect no longer reacts to this button,
              // so later clicks re-run it directly.
              if (!hasGenerated) setHasGenerated(true);
              else void computeRoi();
            }}
            disabled={calcLoading || !canGenerate}
            className="mt-0.5 inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-6 text-[14px] font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {calcLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5" aria-hidden />
            )}
            Generate The Outlook
          </button>
          {!canGenerate && (
            <p className="text-center text-[12px] text-white/35">
              Set {missing.length > 1 ? missing.slice(0, -1).join(", ") + " and " : ""}
              {missing[missing.length - 1]} to begin.
            </p>
          )}

          {/* Says what is left, and only once there is something to say. Shown
              on the last free location rather than every time, so it lands as a
              heads-up instead of a running meter nobody asked for. */}
          {canGenerate &&
            !lockedReason &&
            quota !== null &&
            quota.freePincodes - quota.pincodesUsed <= 1 && (
              <p className="text-center text-[12px] text-white/40">
                {quota.pincodesUsed >= quota.freePincodes
                  ? "Last free location — an account opens up every pincode."
                  : "1 free location left — an account opens up every pincode."}
              </p>
            )}
        </div>

        {/* ─────────── RIGHT: catchment + results ─────────── */}
        <div className="relative flex min-w-0 flex-col">
          {/* Catchment view. Empty until the reader asks for an outlook — no map,
              no rings, no numbers, because a catchment nobody chose is a figure
              nobody should read. Once there is a result the map takes over and
              every overlay comes with it. The overlays need z-index: Leaflet's
              own control layers sit at 1000 in this same stacking context. */}
          <div className="relative z-0 min-h-[240px] flex-1 overflow-hidden bg-[#0f0f10] lg:min-h-[300px]">
            {/* z-0 above is load-bearing: Leaflet numbers its own panes up to
                1000 and its controls above that, and with no stacking context
                of its own the map would compare those against the whole page —
                painting over the sticky header and over the ROI Analysis tab
                that overlaps its bottom edge. A stacking context at z-0 keeps
                all of that arithmetic inside this box.

                Faint texture under both states, so the empty panel is not a
                flat void. It is a grid, not a pretend map. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,#6b7280_1px,transparent_1px),linear-gradient(to_bottom,#6b7280_1px,transparent_1px)] [background-size:56px_56px]"
            />

            {showMap && mapCenter && radiusKm !== null ? (
              <>
                <CatchmentMap center={mapCenter} radiusKm={radiusKm} points={mapPoints} />

                <span className="pointer-events-none absolute left-5 top-5 z-[1100] inline-flex items-center gap-2 rounded-full bg-black/70 py-2 pl-3 pr-4 text-[13px] text-white backdrop-blur-sm">
                  {/* Same lit orb as the empty state, at chip scale, so the
                      placeholder and the live map read as one thing. */}
                  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <span
                      aria-hidden
                      className="how-orb-halo absolute inset-0 rounded-full bg-spark/50 blur-[6px]"
                    />
                    <Image
                      src="/visualize-orb.gif"
                      alt=""
                      width={150}
                      height={150}
                      unoptimized
                      aria-hidden
                      className="how-orb-core relative h-5 w-5 object-contain"
                    />
                  </span>
                  Your Future is here...
                </span>

                {/* Labelled, because the map has its own +/- in the opposite
                    corner and two identical white stacks read as two zooms. */}
                <div className="absolute right-5 top-5 z-[1100] flex flex-col items-center gap-1.5">
                  <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                    Radius
                  </span>
                  <div className="flex flex-col overflow-hidden rounded-md">
                    <button
                      type="button"
                      onClick={() => setRadiusKm((r) => Math.min(100, (r ?? 0) + 5))}
                      aria-label="Widen the service radius by 5 kilometres"
                      className="inline-flex h-9 w-9 items-center justify-center bg-white/90 text-black transition hover:bg-white"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRadiusKm((r) => Math.max(1, (r ?? 6) - 5))}
                      aria-label="Narrow the service radius by 5 kilometres"
                      className="inline-flex h-9 w-9 items-center justify-center border-t border-black/10 bg-white/90 text-black transition hover:bg-white"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Sits a line above the bottom edge to clear the map's
                    attribution, which is required and cannot leave the corner. */}
                <p className="pointer-events-none absolute bottom-8 left-5 z-[1100] max-w-[46%] text-[12px] leading-relaxed text-white/45 sm:max-w-xs">
                  {placeLabel || regionLabel || "Pick a location"} · {radiusKm} km radius ·{" "}
                  {areaLabel} km&sup2;
                </p>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                {/* The empty panel is mostly background, so the placeholder is
                    sized to hold it: the same lit orb the "Visualize your
                    Future" chip uses, at panel scale rather than chip scale.
                    Unoptimized because Next's image pipeline would otherwise
                    flatten the animation to a single frame. */}
                <span className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center sm:h-28 sm:w-28">
                  <span
                    aria-hidden
                    className="how-orb-halo absolute inset-0 rounded-full bg-spark/40 blur-[28px]"
                  />
                  <Image
                    src="/visualize-orb.gif"
                    alt=""
                    width={300}
                    height={300}
                    unoptimized
                    aria-hidden
                    className="how-orb-core relative h-20 w-20 object-contain sm:h-28 sm:w-28"
                  />
                </span>
                <span className="inline-flex items-center gap-2.5 text-[18px] font-medium tracking-tight text-white/85 sm:text-[22px]">
                  {hasGenerated && calcLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Your Future is here...
                </span>
                {!hasGenerated && (
                  <p className="max-w-[20rem] text-[13px] leading-relaxed text-white/35">
                    Choose a specialization and a location, then generate the
                    outlook to see your catchment.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ROI Analysis — the cards exist only once the reader has asked for
              an outlook. Before that they would be five headings over five
              dashes, which reads as a panel that failed to load rather than
              one waiting for an answer. */}
          {hasGenerated && (
            <div className="relative border-t border-white/[0.07] p-3.5 sm:p-4">
              <span className="absolute -top-[17px] left-5 inline-flex items-center gap-2 rounded-t-lg bg-ink-800 px-4 py-2 text-[13px] text-white/85">
                ROI Analysis
                <ChevronDown className="h-3.5 w-3.5 text-white/50" aria-hidden />
              </span>

              {/* Column widths and the 10px gutter are the Figma's: the catchment
                  column is a little narrower than the two beside it. */}
              <div className="grid gap-2.5 lg:grid-cols-[229fr_257fr_257fr]">
                {/* Column 1 — catchment and burden */}
                <div className="flex flex-col gap-2.5">
                  <div className="relative flex-1 overflow-hidden rounded-xl bg-ink-600 p-3.5">
                    {/* The Figma puts a heavily blurred shape behind this corner;
                        at that blur radius it reads as a wash, so it is one. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -left-20 -top-10 h-40 w-52 rounded-full bg-white/[0.07] blur-3xl"
                    />
                    <p className="relative inline-flex items-center gap-1.5 text-[13px] text-[#A5A5A5]">
                      Catchment Population
                      <Info className="h-3 w-3 text-[#A5A5A5]" aria-hidden />
                    </p>
                    <p className="relative mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xl font-bold tabular-nums text-white">
                        {serviceablePopulation
                          ? `${formatPeopleShort(serviceablePopulation)}+`
                          : "—"}
                      </span>
                      <span className="text-[11px] text-[#A5A5A5]">
                        People within {radiusKm}km radius
                      </span>
                    </p>
                    <FigureRow filled={serviceablePopulation ? 10 : 0} tone="accent" />
                  </div>

                  <div className="flex-1 rounded-xl bg-accent p-3.5">
                    <p className="inline-flex items-center gap-1.5 text-[13px] text-white">
                      Disease Burden
                      <Info className="h-3 w-3 text-white" aria-hidden />
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xl font-bold tabular-nums text-white">
                        {prevalenceCount ? `${formatPeopleShort(prevalenceCount)}+` : "—"}
                      </span>
                      <span className="text-[11px] text-white">People needing Care</span>
                    </p>
                    <FigureRow filled={burdenFigures} tone="white" />
                  </div>
                </div>

                {/* Column 2 — revenue */}
                <div className="relative flex flex-col justify-center overflow-hidden rounded-xl bg-ink-600 p-3.5">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-28 left-0 right-0 h-56 rounded-[50%] bg-white/[0.06] blur-3xl"
                  />
                  <p className="relative inline-flex items-center gap-1.5 text-[13px] text-[#A5A5A5]">
                    Projected Revenue (Annual)
                    <Info className="h-3 w-3 text-[#A5A5A5]" aria-hidden />
                  </p>
                  <p className="relative mt-2.5 text-[clamp(1.5rem,2.5vw,2.125rem)] font-bold leading-none tabular-nums text-white">
                    {hasGenerated ? formatINRShort(projectedRevenue) : "—"}
                  </p>
                  <p className="relative mt-3 text-[12px] leading-relaxed text-[#A5A5A5]">
                    Estimated opportunity based on your location and practice profile.
                  </p>
                </div>

                {/* Column 3 — impact */}
                <div className="flex flex-col rounded-xl bg-ink-600 p-3.5">
                  <p className="inline-flex items-center gap-2 text-[13px] text-[#A5A5A5]">
                    Impact
                    <Info className="h-3.5 w-3.5 text-[#A5A5A5]" aria-hidden />
                  </p>
                  {/* The reading sits inside the arc, as on a real dial face — so it
                      is positioned against the gauge itself rather than this card,
                      whose height the two neighbouring columns decide. */}
                  <div className="flex flex-1 items-center">
                    <ImpactGauge pct={impactPct} />
                  </div>
                  <p className="mt-3 text-center text-[12px] text-[#A5A5A5]">
                    Local Burden Addressed
                  </p>
                </div>
              </div>

              {calcError && (
                <p className="mt-3 text-center text-xs text-red-300" role="alert">
                  {calcError}
                </p>
              )}

              <p className="mt-3 flex items-center justify-center gap-2 text-center text-[12px] text-white/35">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Estimates are based on aggregated healthcare data &amp; Industry Benchmarks
              </p>
            </div>
          )}

          {/* The CTA is not part of the outlook, so it stays put whether or not
              there is one to read. */}
          {(onCtaClick || ctaLabel) && (
            <div className="flex justify-center border-t border-white/[0.07] p-4 sm:p-5">
              {onCtaClick ? (
                <button
                  type="button"
                  onClick={onCtaClick}
                  className="rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                >
                  {ctaLabel ?? "Speak to Legends of Medicine Concierge"}
                </button>
              ) : (
                <a
                  href={ctaHref}
                  className="rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
                >
                  {ctaLabel}
                </a>
              )}
            </div>
          )}

          {/* The wall, over the whole results column: map, cards and all. It is
              the last child so it paints above them, and it covers the column
              rather than the page because the inputs on the left stay usable —
              a reader can see exactly what they were about to ask for. */}
          {lockedReason && (
            <RoiSignupGate reason={lockedReason} quota={quota} />
          )}
        </div>
      </div>

      {/* ─────────── Method + per-pincode breakdown ─────────── */}
      {/* Both notes explain a population count, so they wait for one to exist —
          otherwise the resting panel carries a footer about numbers it is not
          showing, and pushes its own controls off the bottom of the screen. */}
      {!compact && hasGenerated && (
        <div className="border-t border-white/[0.07] p-4 sm:p-5">
          {/* Collapsed by default: reassurance-on-demand, not something the
              reader needs before the numbers above. Native <details> so it
              works without JS, on keyboard, and on touch. */}
          <details className="group rounded-lg bg-ink-850">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-2.5 transition hover:brightness-110 [&::-webkit-details-marker]:hidden">
              {/* Same treatment as the breakdown row below it: two sibling
                  accordions that sit one above the other have to read as a
                  pair, and one of them dimmed looks disabled rather than
                  secondary. */}
              <span className="text-sm font-semibold text-white">
                How we count the population
              </span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-white/45 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-4 text-xs leading-relaxed text-white/55">
              India is mapped as a grid of ~200 m cells, each with its own headcount, and
              your radius sums the real cells inside it — never radius &times; average
              density. Cells come from{" "}
              <span className="text-white/75">Google Open Buildings</span> footprints scaled
              by <span className="text-white/75">GHSL</span> height, carrying{" "}
              <span className="text-white/75">WorldPop</span> totals blended with Meta&apos;s{" "}
              <span className="text-white/75">HRSL</span> at a ratio tuned per density band,
              then tagged to 2025 pincode boundaries (localities from the{" "}
              <span className="text-white/75">India Post</span> directory). Calibrated
              against ground-truth data for hundreds of pincodes — estimates, not a census.
            </p>
          </details>

          {(coverage.length > 0 || densityFallback) && (
            /* Collapsed like the method note above it. The table can run to
               dozens of rows, so left open it buries everything under a scroll
               of detail nobody has asked for yet; the summary line keeps the one
               fact worth reading at a glance. Native <details> for the same
               reason as above: it works without JS, on keyboard, and on touch. */
            <details className="group mt-3 rounded-lg bg-ink-850">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-2.5 transition hover:brightness-110 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-sm font-semibold text-white">
                    Additional Geographical Info
                  </span>
                  <span className="text-xs text-white/60">{coverageSummary}</span>
                </span>
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-white/45 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <div className="px-5 pb-5">
                {densityFallback ? (
                  <p className="rounded-lg bg-ink-800 p-3 text-xs leading-relaxed text-white/60">
                    No population-grid cells fall inside this radius, so the catchment
                    above is an area × density estimate rather than a pincode-by-pincode
                    count. This happens in sparsely populated areas where the grid has
                    nothing to measure — widen the radius for a counted figure.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs leading-relaxed text-white/45">
                      Coverage is the share of each pincode&apos;s people inside your{" "}
                      {radiusKm} km radius — counted cell by cell from a 200 m population
                      grid, not by area. Distance runs from the centre of your radius to
                      the centre of that pincode, so a large pincode can sit further away
                      than {radiusKm} km and still reach into the circle.
                    </p>

                    {/* One control, on the right, above the column headers it reorders.
                        Native select: it opens without JS and gets the OS picker on
                        touch, where a custom menu over a scrolling table would fight
                        the finger. */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <label
                        htmlFor="coverage-sort"
                        className="text-[11px] uppercase tracking-wider text-white/40"
                      >
                        Sort
                      </label>
                      <select
                        id="coverage-sort"
                        value={coverageSort}
                        onChange={(e) => setCoverageSort(e.target.value as CoverageSortKey)}
                        className="cursor-pointer rounded-md bg-ink-800 px-2 py-1 text-xs text-white/80 ring-1 ring-white/10 transition hover:text-white focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {COVERAGE_SORTS.map((s) => (
                          <option key={s.key} value={s.key} className="bg-ink-800 text-white">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto rounded-lg ring-1 ring-white/5">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-ink-800">
                          <tr className="text-[11px] uppercase tracking-wider text-white/45">
                            <th scope="col" className="px-3 py-2 font-medium">Pincode</th>
                            <th scope="col" className="px-3 py-2 font-medium">Area</th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Distance
                            </th>
                            <th scope="col" className="px-3 py-2 font-medium">Coverage</th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              People in radius
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCoverage.map((c) => {
                            const isHome = c.pincode === result?.pincode;
                            return (
                              <tr
                                key={c.pincode}
                                className={
                                  isHome
                                    ? "border-t border-white/5 bg-accent/10"
                                    : "border-t border-white/5"
                                }
                              >
                                <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-white">
                                  {c.pincode}
                                  {isHome && (
                                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
                                      yours
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-white/70">
                                  {c.office ? cleanAreaName(c.office) : "—"}
                                </td>
                                {/* The circle is centred on this pincode's population-weighted
                                    point while distances are measured to India Post's geometric
                                    centre, so its own row lands ~0.5 km from itself. That gap is
                                    an artefact of two different centres, not a real distance —
                                    name the row for what it is instead of printing it. */}
                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-white/70">
                                  {isHome ? (
                                    <span className="text-white/50">centre</span>
                                  ) : (
                                    `${c.distanceKm.toFixed(1)} km`
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10"
                                      aria-hidden="true"
                                    >
                                      <div
                                        className="h-full rounded-full bg-accent"
                                        style={{
                                          width: `${Math.max(2, Math.min(100, c.exposurePct))}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="tabular-nums text-white/80">
                                      {c.exposurePct >= 99.95
                                        ? "100%"
                                        : `${c.exposurePct.toFixed(1)}%`}
                                    </span>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-white">
                                  {formatNumber(Math.round(c.inCirclePop))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-3 text-right text-xs text-white/55">
                      {formatNumber(coverage.length)} pincode
                      {coverage.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-semibold text-white/80">
                        {formatNumber(serviceablePopulation)}
                      </span>{" "}
                      people in radius
                    </p>
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
