"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Eyebrow, QualityTag, ScoreRow, VerdictTag, XpDelta } from "./atoms";
import { formatTime, gradedMetrics, levelFromXp, levelName } from "./scoring";
import type { CaseResult } from "./types";

/**
 * The two things that end a case: committing to an answer, and being told how
 * it went.
 */

/**
 * Lock in.
 *
 * Both fields are required, and the button says so by staying dead until they
 * are filled. The reasoning is not politeness — it is half of what the case is
 * scored on, and a doctor who types a diagnosis and nothing else would be
 * marked down for a field they did not know mattered.
 */
export function LockInModal({
  onCancel,
  onSubmit,
  submitting,
  failure,
}: {
  onCancel: () => void;
  onSubmit: (diagnosis: string, reasoning: string) => void;
  submitting: boolean;
  /** Said inside the modal, because that is where the doctor is standing. A
   *  grading failure reported on the screen behind this one is not reported. */
  failure?: string | null;
}) {
  const [diagnosis, setDiagnosis] = useState("");
  const [reasoning, setReasoning] = useState("");
  const firstField = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  // Escape closes it, as it does everywhere else. Not while it is being graded:
  // the request is already in flight and closing would strand it.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  const ready = diagnosis.trim().length > 0 && reasoning.trim().length > 0;

  const field =
    "w-full rounded-2xl bg-ink-800 px-4 py-3 text-sm leading-relaxed text-white/90 outline-none ring-1 ring-white/10 transition placeholder:text-white/25 focus:ring-accent/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="caseroom-lockin-title"
    >
      <div className="w-full max-w-lg rounded-[22px] bg-ink-900 p-6 ring-1 ring-white/[0.08] sm:p-8">
        <h2 id="caseroom-lockin-title" className="font-serif text-2xl leading-tight text-white">
          Lock in your diagnosis
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          This is final. You are graded on your reasoning, not only on the answer.
        </p>

        <div className="mt-6 grid gap-5">
          <div>
            <label htmlFor="caseroom-diagnosis" className="mb-2 block">
              <Eyebrow>Diagnosis</Eyebrow>
            </label>
            <textarea
              id="caseroom-diagnosis"
              ref={firstField}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Your final diagnosis"
              rows={2}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="caseroom-reasoning" className="mb-2 block">
              <Eyebrow>Your reasoning</Eyebrow>
            </label>
            <p className="mb-2 text-[13px] text-white/40">
              Cite the findings that convinced you, and why they beat the alternatives.
            </p>
            <textarea
              id="caseroom-reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Which findings convinced you, and why?"
              rows={5}
              className={field}
            />
          </div>
        </div>

        {failure ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-[#CF7A70]/[0.08] px-4 py-3 text-sm leading-relaxed text-[#E0A49D] ring-1 ring-[#CF7A70]/20"
          >
            {failure}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-white/60 transition hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(diagnosis.trim(), reasoning.trim())}
            disabled={submitting || !ready}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/35"
          >
            {submitting ? "Evaluating…" : "Submit diagnosis"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-white/75">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** The debrief. Everything the doctor was not allowed to see until now. */
export function ResultCard({ result, onClose }: { result: CaseResult; onClose: () => void }) {
  const delta = result.after - result.before;
  const levelBefore = levelFromXp(result.before);
  const levelAfter = levelFromXp(result.after);
  const metrics = gradedMetrics(result);

  const deltaLabel =
    levelAfter > levelBefore
      ? "Level up"
      : levelAfter < levelBefore
        ? "Level down"
        : delta === 0
          ? "Held"
          : delta > 0
            ? "Experience gained"
            : "Experience lost";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="caseroom-result-title"
    >
      <div className="mx-auto w-full max-w-3xl rounded-[22px] bg-ink-900 p-6 ring-1 ring-white/[0.08] sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictTag correct={result.correct} />
          <QualityTag quality={`${result.reasoning_quality} reasoning`} />
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[12px] tabular-nums text-white/35"
            title="Session time — never part of your score"
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            {formatTime(result.duration_sec)}
          </span>
        </div>

        <h2
          id="caseroom-result-title"
          className="mt-5 font-serif text-[clamp(1.7rem,3.4vw,2.5rem)] leading-[1.1] text-white"
        >
          {result.headline}
        </h2>

        {/* The XP change, given its own block. It is the one number a doctor
            looks for first, and burying it in a row of tags would make them
            hunt for it. */}
        <div className="mt-6 rounded-[18px] bg-white/[0.03] p-5 ring-1 ring-white/[0.06]">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <XpDelta delta={delta} className="font-serif text-3xl" />
            <span className="text-sm text-white/45">{deltaLabel}</span>
            <span className="ml-auto text-[13px] tabular-nums text-white/40">
              {result.before} → {result.after} XP
              {levelAfter !== levelBefore
                ? ` · ${levelName(levelBefore)} → ${levelName(levelAfter)}`
                : ""}
            </span>
          </div>

          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-deep via-accent to-accent-soft transition-[width] duration-1000 ease-out"
              style={{ width: `${result.after}%` }}
            />
          </div>

          {result.xp_reason ? (
            <p className="mt-3 text-[13px] leading-relaxed text-white/50">{result.xp_reason}</p>
          ) : null}
        </div>

        {metrics.length > 0 || typeof result.overall === "number" ? (
          <div className="mt-8">
            <ScoreRow overall={result.overall} metrics={metrics} />
          </div>
        ) : null}

        <div className="mt-8 grid gap-6">
          <ResultSection title="Your diagnosis">{result.final_diagnosis}</ResultSection>
          <ResultSection title="Correct diagnosis">{result.correct_diagnosis}</ResultSection>
          <ResultSection title="Your reasoning">{result.final_reasoning}</ResultSection>

          {result.did_well?.length ? (
            <ResultSection title="What you did well">
              <Bullets items={result.did_well} />
            </ResultSection>
          ) : null}

          {result.gaps?.length ? (
            <ResultSection title="Gaps">
              <Bullets items={result.gaps} />
            </ResultSection>
          ) : null}

          {result.note ? (
            <ResultSection title="Attending's note">
              <p className="border-l-2 border-accent/40 pl-4 italic text-white/65">{result.note}</p>
            </ResultSection>
          ) : null}

          {/* Where the patient came from. Shown last and set small: it matters
              for trust, not for the debrief. */}
          {result.source ? (
            <p className="text-[12px] leading-relaxed text-white/30">Based on {result.source}</p>
          ) : null}
        </div>

        <div className="mt-9 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Back to Caseroom
          </button>
        </div>
      </div>
    </div>
  );
}
