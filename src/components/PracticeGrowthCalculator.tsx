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

interface PincodeLookup {
  pincode: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  region?: string | null;
  populationPerSqKm: number;
}

interface RoiResult {
  specialization: { slug: string; label: string };
  pincode: string;
  city: string | null;
  region: string | null;
  radiusKm: number;
  expectedPatients: number;
  serviceablePopulation: number;
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
  ctaHref?: string;
  onCtaClick?: () => void;
  lockSpecialty?: boolean;
  compact?: boolean;
  defaultPincode?: string;
  defaultRadiusKm?: number;
  defaultExpectedPatients?: number;
}

export function PracticeGrowthCalculator({
  defaultSpecialty = "cataract",
  ctaHref = "#get-started",
  onCtaClick,
  lockSpecialty = false,
  compact = false,
  defaultPincode = "600037",
  defaultRadiusKm = 5,
  defaultExpectedPatients = 300,
}: Props) {
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [specSlug, setSpecSlug] = useState<string>(defaultSpecialty);
  const [pincode, setPincode] = useState<string>(defaultPincode);
  const [radiusKm, setRadiusKm] = useState<number>(defaultRadiusKm);
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
        if (body?.success && Array.isArray(body.data) && body.data.length > 0) {
          setSpecs(body.data);
          if (!body.data.some((s: Specialization) => s.slug === specSlug)) {
            setSpecSlug(body.data[0].slug);
          }
        } else {
          setSpecs(FALLBACK_SPECIALIZATIONS);
        }
      } catch {
        if (!cancelled) setSpecs(FALLBACK_SPECIALIZATIONS);
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

  // ─── derived display values (use backend result when present) ─────────────
  const serviceablePopulation = result?.serviceablePopulation ?? 0;
  const prevalenceCount = result?.prevalenceCount ?? 0;
  const projectedRevenue = result?.projectedRevenue ?? 0;
  const impactPct = result?.impactPct ?? 0;
  const stature = result?.stature ?? "—";
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
            <span className="ml-3 shrink-0 text-base font-bold tabular-nums text-white">
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
            <div className="rounded-lg border border-accent/40 bg-accent/10 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-white/65">
                Stature Ranking
              </dt>
              <dd className="mt-1 text-lg font-semibold text-accent-soft">
                {stature}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-center text-xs text-white/45">
            Avg. selling price (ASP):{" "}
            {result
              ? formatINRShort(result.avgSellingPriceInr)
              : activeSpec
                ? formatINRShort(activeSpec.avgSellingPriceInr)
                : "—"}{" "}
            · Prevalence{" "}
            {result
              ? `${result.prevalencePct.toFixed(2)}%`
              : activeSpec
                ? `${activeSpec.prevalencePct.toFixed(2)}%`
                : "—"}
          </p>

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
                Speak to Ophthaxp Concierge
              </button>
            ) : (
              <a
                href={ctaHref}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
              >
                Know more
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
