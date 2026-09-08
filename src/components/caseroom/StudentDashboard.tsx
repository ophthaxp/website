"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Flame } from "lucide-react";
import { loma } from "@/lib/lomaClient";
import { PageHeading } from "@/components/dashboard/PageHeading";
import { ErrorNote, Eyebrow, LevelMeter, Panel, StatCard } from "./atoms";
import { CoachPanel } from "./CoachPanel";
import { Logbook } from "./Logbook";
import { greeting, xpOf } from "./scoring";
import type { Enrollment, LomaProfile } from "./types";

/**
 * Caseroom's home screen for a doctor working cases.
 *
 * Two columns: what they have done on the left, what to do next on the right.
 * The order matters — the standalone app opened on the Start button, and a tool
 * that opens on its own call to action tells a returning doctor nothing about
 * where they are. Progress first, then the invitation.
 */

/** The one thing on this screen that is not a number: a fresh patient. */
function StartCard({
  enrollment,
  disabled,
  starting,
  onStart,
}: {
  enrollment: Enrollment | null;
  disabled: boolean;
  starting: boolean;
  onStart: (programId: number | null) => void;
}) {
  return (
    <Panel hover="lift">
      {/* The same low-right bloom the Growth Lab cards carry, so this reads as
          one of the site's cards rather than a control panel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[3.5rem] -right-[1.75rem] h-[17rem] w-[17rem] rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.10),rgba(183,90,68,0.04)_44%,rgba(183,90,68,0)_72%)] opacity-80 transition duration-500 group-hover:opacity-100"
      />

      <div className="relative">
        <Eyebrow>{enrollment ? enrollment.program_name : "Ready when you are"}</Eyebrow>

        <h3 className="mt-3 font-serif text-[clamp(1.6rem,2.4vw,2.1rem)] leading-[1.1] text-white">
          New case
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-white/55">
          {enrollment
            ? `A fresh ${enrollment.topic} patient from this programme, matched to your level.`
            : "A fresh patient, matched to your level. Work them up, then lock in your diagnosis."}
        </p>

        <button
          type="button"
          disabled={disabled || starting}
          onClick={() => onStart(enrollment?.program_id ?? null)}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/35"
        >
          {starting ? "Preparing…" : "Start a case"}
          {!starting ? (
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          ) : null}
        </button>
      </div>
    </Panel>
  );
}

export function StudentDashboard({
  profile,
  aiReady,
}: {
  profile: LomaProfile;
  aiReady: boolean;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Rendered after mount, never on the server. "Good evening" is worked out
     from the reader's own clock, and the server's clock is not it. */
  const [hello, setHello] = useState<string | null>(null);
  useEffect(() => setHello(greeting()), []);

  const history = profile.history ?? [];
  const stats = profile.stats;
  const approved = (profile.enrollments ?? []).filter((e) => e.status === "approved");

  /**
   * Move to the case player, switching programme first if they picked one.
   *
   * The switch has to land before the case is generated — the active programme
   * decides which case comes out — so it is awaited rather than fired off. If
   * it fails, say so and stay put rather than starting a case from the wrong
   * programme without mentioning it.
   */
  async function start(programId: number | null) {
    setError(null);
    setStarting(true);
    try {
      if (programId && programId !== profile.active_program_id) {
        await loma.setActiveProgram(programId);
      }
      router.push("/account/caseroom/case");
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="grid gap-8">
      <PageHeading
        eyebrow={hello ?? "Caseroom"}
        level={1}
        title="Caseroom"
        aside={
          <div className="flex items-center justify-end gap-2 text-sm">
            <Flame
              className={`h-4 w-4 ${stats.current_streak > 0 ? "text-accent" : "text-white/25"}`}
              strokeWidth={1.8}
              aria-hidden
            />
            <span className={stats.current_streak > 0 ? "text-white/70" : "text-white/40"}>
              {stats.current_streak} day streak
            </span>
          </div>
        }
      />

      <p className="-mt-3 max-w-xl text-sm leading-relaxed text-white/50">
        {history.length === 0
          ? "Start your first case to begin your climb."
          : `You have worked ${history.length} case${history.length === 1 ? "" : "s"} so far — keep it going.`}
      </p>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {!aiReady ? (
        <ErrorNote>
          Caseroom cannot write new patients right now. Your logbook is unaffected — please try again
          shortly.
        </ErrorNote>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <LevelMeter xp={xpOf(profile)} />

          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard label="Cases completed" value={stats.total_cases} />
            <StatCard label="Accuracy" value={`${Math.round(stats.accuracy)}%`} />
            <StatCard label="Best streak" value={stats.best_streak} />
          </div>

          <Logbook history={history} />
        </div>

        <aside className="grid content-start gap-6">
          {/* One card per programme once there are several to choose between —
              which programme a case comes from is a real choice, and a single
              button would make it silently for them. */}
          {approved.length >= 2 ? (
            approved.map((enrollment) => (
              <StartCard
                key={enrollment.program_id}
                enrollment={enrollment}
                disabled={!aiReady}
                starting={starting}
                onStart={start}
              />
            ))
          ) : (
            <StartCard
              enrollment={approved[0] ?? null}
              disabled={!aiReady}
              starting={starting}
              onStart={start}
            />
          )}

          <CoachPanel refreshKey={history.length} />
        </aside>
      </div>
    </div>
  );
}
