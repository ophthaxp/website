"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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

export function PracticeGrowthCalculator({
  defaultSpecialty = "cataract",
  courseSlug,
  courseName,
  ctaHref = "#get-started",
  onCtaClick,
  lockSpecialty = false,
  compact = false,
  defaultPincode = "600037",
  defaultRadiusKm = 5,
  defaultExpectedPatients = 300,
  ctaLabel,
}: Props) {
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [specSlug, setSpecSlug] = useState<string>(defaultSpecialty);
  const [pincode, setPincode] = useState<string>(defaultPincode);
  const [radiusKm, setRadiusKm] = useState<number>(Math.max(1, defaultRadiusKm));
  const [expectedPatients, setExpectedPatients] = useState<number>(
    defaultExpectedPatients,
  );

  const [pinLookup, setPinLookup] = useState<PincodeLookup | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [result, setResult] = useState<RoiResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

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
          setPinError(body?.error || "Pincode not found");
        }
      } catch (err) {
        if (cancelled) return;
        setPinLookup(null);
        setPinError(err instanceof Error ? err.message : "Pincode lookup failed");
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
    if (!specSlug || !/^\d{6}$/.test(pincode) || !pinLookup) {
      setResult(null);
      return;
    }
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
      if (body?.success && body.data) {
        setResult(body.data as RoiResult);
      } else {
        setResult(null);
        setCalcError(body?.error || "Calculation failed");
      }
    } catch (err) {
      setResult(null);
      setCalcError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setCalcLoading(false);
    }
  }, [specSlug, pincode, pinLookup, radiusKm, expectedPatients]);

  const calcTimer = useRef<number | null>(null);
  useEffect(() => {
    if (calcTimer.current) window.clearTimeout(calcTimer.current);
    calcTimer.current = window.setTimeout(computeRoi, 250);
    return () => {
      if (calcTimer.current) window.clearTimeout(calcTimer.current);
    };
  }, [computeRoi]);

  const activeSpec = useMemo(
    () => specs.find((s) => s.slug === specSlug) ?? null,
    [specs, specSlug],
  );

  // Area of the serviceable circle (pi * r^2), shown live while dragging.
  const areaSqKm = useMemo(() => Math.PI * radiusKm * radiusKm, [radiusKm]);
  const areaLabel = useMemo(() => formatSqKm(areaSqKm), [areaSqKm]);

  // The pincode's own footprint, which the radius circle may be smaller or
  // larger than. Null when the backend has no boundary polygon for it.
  const pincodeAreaSqKm = pinLookup?.areaSqKm ?? null;
  const pincodeAreaLabel =
    pincodeAreaSqKm !== null ? formatSqKm(pincodeAreaSqKm) : null;

  // ─── derived display values (use backend result when present) ─────────────
  const serviceablePopulation = result?.serviceablePopulation ?? 0;
  const prevalenceCount = result?.prevalenceCount ?? 0;
  const projectedRevenue = result?.projectedRevenue ?? 0;
  const impactPct = result?.impactPct ?? 0;

  // ─── additional geographical info ─────────────────────────────────────────
  // The radius rarely stops at the pincode boundary: it clips neighbours, and it may
  // not even cover all of the pincode it starts in. The backend already returns that
  // split per pincode, so show it rather than leave one aggregate number to be
  // taken on trust.
  const coverage = result?.breakdown ?? [];
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

  const regionLabel =
    pinLookup?.city ||
    pinLookup?.district ||
    pinLookup?.region ||
    result?.region ||
    "";

  return (
    <section
      aria-labelledby="growth-title"
      className={
        compact
          ? "h-full overflow-hidden rounded-md bg-ink-850 p-6 ring-1 ring-white/5"
          : "mt-16 overflow-hidden rounded-2xl bg-ink-850 p-6 ring-1 ring-white/5 sm:p-10"
      }
    >
      <div
        className={
          compact
            ? "grid h-full gap-6"
            : "grid gap-10 lg:grid-cols-2 lg:items-center"
        }
      >
        {/* ─────────── LEFT: Inputs ─────────── */}
        <div>
          <h2
            id="growth-title"
            className={
              compact
                ? "font-serif text-2xl leading-tight text-white"
                : "font-serif text-3xl leading-tight text-white sm:text-4xl"
            }
          >
            Estimate Your{" "}
            <span className="text-accent-soft">Practice Growth</span>
          </h2>
          {!compact && (
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Pick a specialization, enter your pincode and serviceable radius —
              we'll project your revenue and impact in that catchment.
            </p>
          )}

          {/* Specialization dropdown */}
          <label
            htmlFor="growth-specialty"
            className="mt-8 block text-sm font-semibold text-white"
          >
            Specialization (Condition)
          </label>
          <div className="relative mt-2">
            <select
              id="growth-specialty"
              value={specSlug}
              onChange={(e) => setSpecSlug(e.target.value)}
              disabled={lockSpecialty || specs.length === 0}
              aria-readonly={lockSpecialty}
              className={`w-full appearance-none rounded-lg bg-ink-700 px-4 py-3 pr-10 text-sm font-medium text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-accent ${
                lockSpecialty ? "cursor-not-allowed opacity-80" : "cursor-pointer"
              }`}
            >
              {specs.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-ink-800">
                  {s.label}
                </option>
              ))}
            </select>
            {!lockSpecialty ? (
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
              />
            ) : null}
          </div>

          {activeSpec?.factsBlurb && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm leading-relaxed text-white/90">
                {activeSpec.factsBlurb}
              </p>
            </div>
          )}

          {/* Pincode */}
          <label
            htmlFor="growth-pincode"
            className="mt-8 block text-sm font-semibold text-white"
          >
            Pincode
          </label>
          <input
            id="growth-pincode"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={pincode}
            onChange={(e) =>
              setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="e.g. 600037"
            className="mt-2 w-full rounded-lg bg-ink-700 px-4 py-3 text-sm font-medium text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="mt-1 min-h-[1.25rem] text-xs">
            {pinLoading ? (
              <span className="text-white/55">Looking up pincode…</span>
            ) : pinError ? (
              <span className="text-red-300">{pinError}</span>
            ) : pinLookup ? (
              <span className="text-white/65">
                {[pinLookup.city, pinLookup.district, pinLookup.state]
                  .filter(Boolean)
                  .join(", ")}
                {pincodeAreaLabel && (
                  <>
                    {" "}
                    &#183;{" "}
                    <span className="font-semibold tabular-nums text-white/80">
                      {pincodeAreaLabel} km&sup2;
                    </span>{" "}
                    total area
                  </>
                )}
              </span>
            ) : null}
          </div>

          {/* Serviceable region (auto) */}
          <label
            htmlFor="growth-region"
            className="mt-6 block text-sm font-semibold text-white"
          >
            Serviceable Region / City
          </label>
          <input
            id="growth-region"
            readOnly
            value={regionLabel}
            placeholder="Auto-filled from pincode"
            className="mt-2 w-full cursor-not-allowed rounded-lg bg-ink-700/60 px-4 py-3 text-sm font-medium text-white/80 ring-1 ring-white/10"
          />

          {/* Radius slider */}
          <div className="mt-8 flex items-end justify-between">
            <label
              htmlFor="growth-radius"
              className="text-sm font-semibold text-white"
            >
              Serviceable Radius
            </label>
            <span className="ml-3 shrink-0 text-right text-base font-bold tabular-nums text-white">
              {radiusKm} KM
            </span>
          </div>
          <input
            id="growth-radius"
            type="range"
            min={1}
            max={100}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            aria-valuetext={`${radiusKm} kilometres, ${areaLabel} square kilometres`}
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-white/55">
            <span>1 KM</span>
            <span>100 KM</span>
          </div>

          {/* Expected patients slider */}
          <div className="mt-8 flex items-end justify-between">
            <label
              htmlFor="growth-patients"
              className="text-sm font-semibold text-white"
            >
              Expected Patients Treated (per year)
            </label>
            <span className="ml-3 shrink-0 text-base font-bold tabular-nums text-white">
              {expectedPatients}
            </span>
          </div>
          <input
            id="growth-patients"
            type="range"
            min={10}
            max={2000}
            step={10}
            value={expectedPatients}
            onChange={(e) => setExpectedPatients(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
          <div className="mt-1 flex justify-between text-xs text-white/55">
            <span>10</span>
            <span>2000</span>
          </div>
        </div>

        {/* ─────────── RIGHT: Outputs ─────────── */}
        <div className="rounded-xl border border-accent/40 bg-ink-950/60 p-6 sm:p-8">
          <p className="text-center text-xs uppercase tracking-wider text-white/55">
            Projected Revenue (annual)
          </p>
          <p className="mt-2 text-center font-serif text-4xl leading-none text-white sm:text-5xl">
            {formatINRShort(projectedRevenue)}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/55">
                Serviceable Population
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {formatNumber(serviceablePopulation)}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/55">
                Prevalence Count
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {formatNumber(prevalenceCount)}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/55">
                Impact %
              </dt>
              <dd className="mt-1 text-lg font-semibold text-white">
                {impactPct ? `${impactPct.toFixed(2)}%` : "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-ink-900/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/55">
                Serviceable Area
              </dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-white">
                {areaLabel} km&sup2;
              </dd>
            </div>
          </dl>

          {calcError && (
            <p className="mt-3 text-center text-xs text-red-300">{calcError}</p>
          )}
          {calcLoading && !result && (
            <p className="mt-3 text-center text-xs text-white/45">Calculating…</p>
          )}

          <p className="mt-6 text-center text-sm font-semibold text-white">
            Ready to reimagine your practice?
          </p>
          <div className="mt-3 flex justify-center">
            {onCtaClick ? (
              <button
                type="button"
                onClick={onCtaClick}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
              >
                {ctaLabel ?? "Speak to Legends of Medicine Concierge"}
              </button>
            ) : (
              <a
                href={ctaHref}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
              >
                {ctaLabel ?? "Know more"}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── How the population model works ─────────── */}
      {/* Collapsed by default: this is reassurance-on-demand, not something the
          reader needs before the numbers above. Native <details> so it works
          without JS, keyboard, and on touch (a hover tooltip would not). */}
      <details className="group mt-8 rounded-xl border border-white/10 bg-ink-950/40 open:bg-ink-950/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/65 transition hover:text-white/85 [&::-webkit-details-marker]:hidden">
          <span>How we count the population</span>
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

      {/* ─────────── Additional Geographical Info ─────────── */}
      {(coverage.length > 0 || densityFallback) && (
        <div className="mt-8 rounded-xl border border-white/10 bg-ink-950/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold text-white">
              Additional Geographical Info
            </h3>
            <p className="text-xs text-white/60">{coverageSummary}</p>
          </div>

          {densityFallback ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-ink-900/60 p-3 text-xs leading-relaxed text-white/60">
              No population-grid cells fall inside this radius, so the serviceable
              population above is an area × density estimate rather than a
              pincode-by-pincode count. This happens in sparsely populated areas where
              the grid has nothing to measure — widen the radius for a counted figure.
            </p>
          ) : (
            <>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Coverage is the share of each pincode&apos;s people inside your {radiusKm} km
            radius — counted cell by cell from a 200 m population grid, not by area.
            Distance runs from the centre of your radius to the centre of that pincode,
            so a large pincode can sit further away than {radiusKm} km and still reach
            into the circle.
          </p>

          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg ring-1 ring-white/5">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-ink-900">
                <tr className="text-[11px] uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-3 py-2 font-medium">Pincode</th>
                  <th scope="col" className="px-3 py-2 font-medium">Area</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Distance</th>
                  <th scope="col" className="px-3 py-2 font-medium">Coverage</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    People in radius
                  </th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((c) => {
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
      )}
    </section>
  );
}
