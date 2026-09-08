"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Eye, Lock, Send, TriangleAlert } from "lucide-react";
import { loma } from "@/lib/lomaClient";
import { ErrorNote, Eyebrow, Panel, TypingDots } from "./atoms";
import { LockInModal, ResultCard } from "./CaseDebrief";
import { formatTime, prettyKey } from "./scoring";
import type { CaseResult, CaseSession, CaseTurn, RevealedFinding } from "./types";

/**
 * Working a case.
 *
 * Three things at once: the brief that does not change, the conversation with
 * the attending, and the evidence uncovered so far. On a wide screen they sit
 * side by side; below that they become tabs over one column, because a
 * three-column layout folded into a phone becomes a very long scroll in which
 * the chat — the only part being used — is in the middle.
 *
 * Nothing clinical is decided here. The findings, the reveals and the grading
 * all come from the platform; this draws what it is told.
 */

type Pane = "brief" | "evidence";

export function CasePlayer() {
  const router = useRouter();

  const [session, setSession] = useState<CaseSession | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [thread, setThread] = useState<CaseTurn[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedFinding[]>([]);
  const [showObjectives, setShowObjectives] = useState(false);
  const [lockInOpen, setLockInOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pane, setPane] = useState<Pane>("brief");

  const bottomRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);

  /* Ask the platform to write a patient when the screen opens.
     `cancelled` guards the double-invoke of React's development strict mode —
     without it a case is generated, thrown away and generated again, which is
     two model calls for one case. */
  useEffect(() => {
    let cancelled = false;

    loma
      .startCase()
      .then((data: CaseSession) => !cancelled && setSession(data))
      .catch((err: Error) => !cancelled && setStartError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // The session clock. Shown to the doctor, never used in scoring.
  useEffect(() => {
    if (!session || result) return;
    if (startedAt.current === null) startedAt.current = Date.now();

    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)),
      500,
    );
    return () => clearInterval(tick);
  }, [session, result]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, waiting]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || waiting || !session) return;

    setThread((t) => [...t, { role: "trainee", content: text }]);
    setInput("");
    setError(null);
    setWaiting(true);

    try {
      const data = await loma.sendMessage(session.session_id, text);
      setThread((t) => [...t, { role: "attending", content: data.reply }]);
      setRevealed(data.revealed);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setWaiting(false);
    }
  }, [input, waiting, session]);

  async function submitDiagnosis(diagnosis: string, reasoning: string) {
    if (!session) return;

    setEvaluating(true);
    setError(null);

    try {
      const seconds = startedAt.current
        ? Math.floor((Date.now() - startedAt.current) / 1000)
        : 0;
      const data = await loma.lockIn(session.session_id, diagnosis, reasoning, seconds);
      setResult(data);
      setLockInOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEvaluating(false);
    }
  }

  /* Back to the dashboard, refreshed. `refresh` matters: the dashboard is a
     server component holding the profile from before this case, so without it
     a doctor returns to their old XP and an empty row where the case they just
     finished should be. */
  const exit = useCallback(() => {
    router.push("/account/caseroom");
    router.refresh();
  }, [router]);

  if (startError) {
    return (
      <div className="mx-auto grid max-w-md gap-5 py-24 text-center">
        <p className="font-serif text-2xl text-white">Could not start the case</p>
        <ErrorNote>{startError}</ErrorNote>
        <button
          type="button"
          onClick={exit}
          className="mx-auto rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          Back to Caseroom
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid place-items-center py-32 text-center">
        <TypingDots label="Writing a fresh patient" />
        <p className="mt-5 font-serif text-2xl text-white">Writing a fresh patient…</p>
        <p className="mt-2 text-sm text-white/40">Grounded in a real published case report.</p>
      </div>
    );
  }

  const revealedKeys = revealed.map((r) => r.key);
  const foundCritical = revealed.some((r) => r.critical);
  const total = session.withheld_keys.length;

  /* Which objectives are done. The four are fixed by the platform, in this
     order, so the checks are positional. */
  const objectiveDone = [
    thread.some((m) => m.role === "trainee"),
    revealedKeys.length >= 3,
    foundCritical,
    Boolean(result),
  ];

  const brief = (
    <Panel as="aside" className="lg:sticky lg:top-6">
      <Eyebrow>The patient</Eyebrow>
      {session.blurb ? (
        <p className="mt-3 font-serif text-lg leading-snug text-white/90">{session.blurb}</p>
      ) : null}

      <div className="mt-6 grid gap-5">
        {[
          { title: "Presenting complaint", body: session.brief.presenting_complaint },
          { title: "History", body: session.brief.history },
          { title: "Examination", body: session.brief.exam_visible },
        ].map((block) => (
          <section key={block.title}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {block.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/70">{block.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-6 border-t border-white/[0.06] pt-4 text-[11px] uppercase tracking-[0.14em] text-white/30">
        AI-generated patient
      </p>
    </Panel>
  );

  const evidence = (
    <Panel as="aside" className="lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between gap-4">
        <Eyebrow>Evidence</Eyebrow>
        <p className="text-sm tabular-nums text-white/45">
          <strong className="font-semibold text-white">{revealedKeys.length}</strong>/{total}
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: total ? `${(revealedKeys.length / total) * 100}%` : "0%" }}
        />
      </div>

      {/* Objectives are covered until asked for. They are a strong hint about
          where to look, and a doctor who wants to work the case cold should not
          have to avoid reading them. */}
      <div className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Objectives
        </h2>

        {showObjectives ? (
          <ul className="mt-3 grid gap-2">
            {session.objectives.map((label, i) => (
              <li
                key={label}
                className={`flex gap-2.5 text-sm leading-relaxed ${
                  objectiveDone[i] ? "text-white/70" : "text-white/40"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-[0.3rem] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[9px] ${
                    objectiveDone[i] ? "bg-accent text-white" : "ring-1 ring-white/20"
                  }`}
                >
                  {objectiveDone[i] ? "✓" : ""}
                </span>
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={() => setShowObjectives(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 text-[13px] text-white/55 ring-1 ring-white/10 transition hover:text-white/80"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            Need direction? Reveal objectives
          </button>
        )}
      </div>

      <ul className="mt-6 grid gap-2">
        {session.withheld_keys.map((key) => {
          const found = revealed.find((r) => r.key === key);
          return (
            <li
              key={key}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 transition ${
                found
                  ? found.critical
                    ? "bg-[#CF7A70]/[0.08] text-white/85 ring-[#CF7A70]/25"
                    : "bg-white/[0.04] text-white/80 ring-white/10"
                  : "text-white/30 ring-white/[0.06]"
              }`}
            >
              {found ? (
                found.critical ? (
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-[#CF7A70]" strokeWidth={1.8} aria-hidden />
                ) : (
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                )
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0 text-white/20" strokeWidth={1.8} aria-hidden />
              )}
              {/* The name of a finding is itself a clue, so a locked one is not
                  named — only counted. */}
              {found ? prettyKey(key) : "Locked finding"}
            </li>
          );
        })}
      </ul>
    </Panel>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={exit}
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Back to Caseroom
        </button>

        <span
          className="ml-auto inline-flex items-center gap-1.5 text-sm tabular-nums text-white/40"
          title="Session time — does not affect your score"
        >
          <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
          {formatTime(elapsed)}
        </span>

        <button
          type="button"
          onClick={() => setLockInOpen(true)}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Lock in diagnosis
        </button>
      </div>

      {/* Tabs only exist below the three-column breakpoint. */}
      <div className="flex gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.06] lg:hidden">
        {(
          [
            { id: "brief" as const, label: "The patient" },
            { id: "evidence" as const, label: `Evidence ${revealedKeys.length}/${total}` },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPane(item.id)}
            aria-pressed={pane === item.id}
            className={`flex-1 rounded-full px-4 py-2 text-[13px] font-medium transition ${
              pane === item.id ? "bg-accent/15 text-accent" : "text-white/45"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)_19rem]">
        <div className={pane === "brief" ? "" : "hidden lg:block"}>{brief}</div>

        <Panel className="flex min-h-[32rem] flex-col p-0 lg:min-h-[38rem]">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-4">
              {thread.length === 0 ? (
                <p className="max-w-md rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/60 ring-1 ring-white/[0.06]">
                  Go ahead — ask about the history, request an examination or a test, or reason out
                  loud. Lock in your diagnosis whenever you are ready.
                </p>
              ) : null}

              {thread.map((turn, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    turn.role === "trainee"
                      ? "ml-auto bg-accent/15 ring-1 ring-accent/25"
                      : "bg-white/[0.04] ring-1 ring-white/[0.06]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {turn.role === "trainee" ? "You" : "Attending"}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                    {turn.content}
                  </p>
                </div>
              ))}

              {waiting ? (
                <div className="max-w-[85%] rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/[0.06]">
                  <TypingDots label="The attending is replying" />
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          {error ? (
            <div className="px-5 pb-3 sm:px-6">
              <ErrorNote>{error}</ErrorNote>
            </div>
          ) : null}

          <div className="border-t border-white/[0.06] p-4 sm:p-5">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter breaks the line. This is a chat,
                  // and a chat that needs a mouse to send is a form.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask about history, exam, or request a test…"
                rows={2}
                disabled={waiting}
                aria-label="Your message to the attending"
                className="min-h-[3rem] flex-1 resize-none rounded-2xl bg-ink-800 px-4 py-3 text-sm leading-relaxed text-white/90 outline-none ring-1 ring-white/10 transition placeholder:text-white/25 focus:ring-accent/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={waiting || !input.trim()}
                aria-label="Send"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/30"
              >
                <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </div>
        </Panel>

        <div className={pane === "evidence" ? "" : "hidden lg:block"}>{evidence}</div>
      </div>

      {lockInOpen ? (
        <LockInModal
          onCancel={() => setLockInOpen(false)}
          onSubmit={submitDiagnosis}
          submitting={evaluating}
        />
      ) : null}

      {result ? <ResultCard result={result} onClose={exit} /> : null}
    </div>
  );
}
