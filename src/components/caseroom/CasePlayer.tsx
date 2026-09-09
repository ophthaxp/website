"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Eye, Lock, Send, TriangleAlert } from "lucide-react";
import { LomaError, loma } from "@/lib/lomaClient";
import { ErrorNote, Eyebrow, Panel, TypingDots } from "./atoms";
import { LockInModal, ResultCard } from "./CaseDebrief";
import { formatTime, prettyKey } from "./scoring";
import { Caret, useMotionAllowed, useTypewriter } from "./typing";
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
 * On a wide screen the whole thing is pinned to the viewport and each column
 * scrolls inside itself, the way a chat client does. The page scrolling as one
 * was wrong here: reading down a long history carried the reply box off the
 * bottom of the screen, and reading the chat carried the brief away — and the
 * brief is what a doctor keeps glancing back at while they work. Three short
 * columns that hold their own place beat one tall page.
 *
 * Nothing clinical is decided here. The findings, the reveals and the grading
 * all come from the platform; this draws what it is told.
 */

type Pane = "brief" | "evidence";

/** A reply is a couple of sentences, so it gets a shorter run than Iris's whole
 *  analysis — long enough to read as speech, short enough not to be a wait. */
const REPLY_TYPING_MS = 1800;

/** Air left under the columns, so they do not sit flush on the bottom edge. */
const BOTTOM_GAP = 24;

/** Below this there is not enough screen to work a case in three columns, and
 *  pinning the page would do more harm than the scrolling it prevents. */
const MIN_COLUMN_HEIGHT = 480;

/**
 * What to say when a question does not come back.
 *
 * Never the server's own words. A failed turn arrives carrying whatever the
 * model provider said about it — "400 Failed to generate JSON. Please adjust
 * your prompt" — which is addressed to whoever wired the thing up, not to a
 * doctor mid-case. It tells them nothing they can act on, and it reads as if
 * they broke something by asking. The raw text goes to the console, where the
 * person it is written for can find it.
 *
 * What a doctor needs is only ever the same two facts: nothing was lost, and
 * asking again is worth a try. Which is true — a turn that fails to come back
 * as JSON almost always succeeds on the next attempt.
 */
function askFailureMessage(err: unknown): string {
  if (err instanceof LomaError && err.status === 429) {
    return "That was a lot of questions in a row. Give it a few seconds and ask again.";
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your connection and ask again.";
  }

  return "That question did not come back. Ask it again — it usually works the second time.";
}

/**
 * One turn of the conversation.
 *
 * The attending's newest reply is written out rather than pasted in — the same
 * treatment Iris's analysis gets, for the same reason: this is a person
 * answering a question, and an answer that lands whole reads as a record being
 * displayed. Older replies never retype. Nobody wants to sit through a
 * conversation they have already had because they scrolled.
 */
function Turn({
  turn,
  typing,
  onDone,
}: {
  turn: CaseTurn;
  typing: boolean;
  onDone?: () => void;
}) {
  const motionOk = useMotionAllowed();
  const trainee = turn.role === "trainee";

  const { shown, done, finish } = useTypewriter(turn.content, {
    animate: typing && motionOk && !trainee,
    durationMs: REPLY_TYPING_MS,
  });

  const ref = useRef<HTMLDivElement>(null);

  /* Tell the case screen the reply is finished — it holds the next question
     until this is said, whether the writing ran its course or was cut short by
     a click. */
  useEffect(() => {
    if (typing && done) onDone?.();
  }, [typing, done, onDone]);

  /* Follow the words down as they arrive — but only if the reader is already at
     the bottom. Dragging them back down mid-sentence because a reply is growing
     somewhere below is worse than letting it grow off-screen. */
  useEffect(() => {
    if (done) return;
    const box = ref.current?.closest<HTMLElement>("[data-chat-scroll]");
    if (!box) return;
    if (box.scrollHeight - box.scrollTop - box.clientHeight < 120) {
      box.scrollTop = box.scrollHeight;
    }
  }, [shown, done]);

  return (
    <div
      ref={ref}
      onClick={done ? undefined : finish}
      title={done ? undefined : "Show the whole reply"}
      aria-busy={!done}
      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        trainee ? "ml-auto bg-accent/15 ring-1 ring-accent/25" : "bg-white/[0.04] ring-1 ring-white/[0.06]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {trainee ? "You" : "Attending"}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
        {shown}
        {done ? null : <Caret />}
      </p>
    </div>
  );
}

export function CasePlayer() {
  const router = useRouter();

  const [session, setSession] = useState<CaseSession | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  /* Bumped to ask for another patient after a failed one. */
  const [attempt, setAttempt] = useState(0);
  const [thread, setThread] = useState<CaseTurn[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [typingLast, setTypingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* A question that did not come back, and what to say about it. Kept apart
     from `error` above, which is for the lock-in — one belongs in the
     conversation, the other does not. */
  const [askFailure, setAskFailure] = useState<{ message: string; question: string } | null>(null);
  const [revealed, setRevealed] = useState<RevealedFinding[]>([]);
  const [showObjectives, setShowObjectives] = useState(false);
  const [lockInOpen, setLockInOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<CaseResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pane, setPane] = useState<Pane>("brief");

  const bottomRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);

  /* Ask the platform to write a patient when the screen opens.
     `cancelled` guards the double-invoke of React's development strict mode —
     without it a case is generated, thrown away and generated again, which is
     two model calls for one case. */
  useEffect(() => {
    let cancelled = false;

    loma
      .startCase()
      .then((data: CaseSession) => !cancelled && setSession(data))
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Caseroom: the case could not be started", err);
        setStartError(
          err instanceof LomaError && err.status === 429
            ? "Caseroom is busy writing patients right now. Try again in a moment."
            : "The patient could not be written. This is usually a hiccup rather than a fault — try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

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

  /**
   * Give this screen the window, the way the standalone app had it.
   *
   * Two earlier goes at this tried to make the columns fit inside a page that
   * is built to scroll — first with a `calc(100vh - …)`, then by measuring the
   * same sum in JavaScript. Both lost to whatever piece of the shell the sum
   * got wrong, and being wrong by even a few pixels hands the scroll back to
   * the page, which then moves all three columns as one.
   *
   * So the page does not scroll here at all. While a case is open the document
   * is locked, and the columns are given exactly the room between where they
   * start and the bottom of the screen. Nothing is lost to the lock, because
   * everything inside those columns scrolls on its own.
   *
   * The lock is dropped on the way out, and never taken on a screen too short
   * to hold a workable case — under that floor the page goes back to scrolling
   * normally, which is worse than this but far better than a chat squeezed into
   * a slot with the rest cut off below the fold.
   */
  useEffect(() => {
    const el = columnsRef.current;
    if (!el) return;

    const root = document.documentElement;
    const previous = root.style.overflow;

    const fit = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;

      /* Measured from the top of the screen, so the page has to be at the top
         for the reading to mean anything. It is about to be pinned there. */
      if (wide) window.scrollTo(0, 0);

      const room = Math.floor(window.innerHeight - el.getBoundingClientRect().top - BOTTOM_GAP);

      if (!wide || room < MIN_COLUMN_HEIGHT) {
        root.style.overflow = previous;
        setFitHeight(null);
        return;
      }

      root.style.overflow = "hidden";
      setFitHeight(room);
    };

    fit();
    window.addEventListener("resize", fit);

    return () => {
      window.removeEventListener("resize", fit);
      root.style.overflow = previous;
    };
    // The columns do not exist until the case does — before that this screen is
    // the "writing a patient" splash.
  }, [session]);

  /* Keep the newest turn in view. `nearest` so it moves the chat column and
     nothing else — the default walks every scrollable ancestor, which now
     includes the page itself. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread, waiting]);

  /* Put a question to the attending. Separate from `send` below so a retry can
     ask the same question again without writing it into the case a second
     time — the doctor asked once, and the transcript should say so once. */
  const ask = useCallback(
    async (text: string) => {
      if (!session) return;

      setAskFailure(null);
      setWaiting(true);

      try {
        const data = await loma.sendMessage(session.session_id, text);
        setThread((t) => [...t, { role: "attending", content: data.reply }]);
        setTypingLast(true);
        setRevealed(data.revealed);
      } catch (err) {
        // The real error, for whoever is debugging this rather than using it.
        console.error("Caseroom: the attending could not answer", err);
        setAskFailure({ message: askFailureMessage(err), question: text });
      } finally {
        setWaiting(false);
      }
    },
    [session],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || waiting || typingLast || !session) return;

    setThread((t) => [...t, { role: "trainee", content: text }]);
    setInput("");
    await ask(text);
  }, [input, waiting, typingLast, session, ask]);

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
      /* Same rule as a failed question: the provider's words go to the console,
         and the doctor is told what is true and what to do about it. Their
         diagnosis and reasoning are still in the fields behind this. */
      console.error("Caseroom: the case could not be graded", err);
      setError(
        err instanceof LomaError && err.status === 429
          ? "The grader is busy right now. Give it a few seconds and submit again."
          : "That did not go through. Your answer is still here — submit it again.",
      );
    } finally {
      setEvaluating(false);
    }
  }

  const replyFinished = useCallback(() => setTypingLast(false), []);

  /* Answering is in progress: the attending is either thinking or still
     speaking. The next question waits for both. */
  const answering = waiting || typingLast;

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

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setStartError(null);
              setAttempt((n) => n + 1);
            }}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-soft"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={exit}
            className="rounded-full px-6 py-3 text-sm font-medium text-white/60 transition hover:text-white"
          >
            Back to Caseroom
          </button>
        </div>
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
    <Panel as="aside" className="quiet-scroll lg:h-full lg:overflow-y-auto">
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
    <Panel as="aside" className="quiet-scroll lg:h-full lg:overflow-y-auto">
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
    /* Pulled up under the nav. The shell's top padding is set for pages that
       scroll, and on a screen that cannot, every pixel above the columns is a
       pixel taken off the case being read. */
    <div className="flex flex-col gap-4 lg:-mt-8">
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

      {/* The measured height lands here as an inline style; the `calc` under it
          is only the first paint, deliberately a little short so that frame can
          leave a gap rather than clip. No `min-height` — with the page pinned,
          a floor taller than the screen would put the bottom of the columns
          somewhere nobody can scroll to.

          `min-h-0` is not a tweak, it is what makes the height above mean
          anything. A flex or grid child's default `min-height: auto` is its own
          content, so a height smaller than the content is quietly ignored and
          the box grows anyway — which is exactly what was happening every time
          this looked like a bad measurement. Every child that has to give way
          to the box carries it. */}
      <div
        ref={columnsRef}
        style={fitHeight ? { height: fitHeight } : undefined}
        className="grid min-h-0 gap-6 lg:h-[calc(100vh-20rem)] lg:grid-cols-[19rem_minmax(0,1fr)_19rem]"
      >
        <div className={`lg:min-h-0 ${pane === "brief" ? "" : "hidden lg:block"}`}>{brief}</div>

        <Panel className="flex min-h-[32rem] flex-col p-0 lg:min-h-0">
          {/* Same reason as above: without `min-h-0` a long conversation makes
              this box refuse to shrink, and it pushes the reply field off the
              bottom instead of scrolling. */}
          <div
            data-chat-scroll
            className="quiet-scroll min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
          >
            <div className="grid gap-4">
              {thread.length === 0 ? (
                <p className="max-w-md rounded-2xl bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/60 ring-1 ring-white/[0.06]">
                  Go ahead — ask about the history, request an examination or a test, or reason out
                  loud. Lock in your diagnosis whenever you are ready.
                </p>
              ) : null}

              {thread.map((turn, i) => (
                <Turn
                  key={i}
                  turn={turn}
                  typing={typingLast && i === thread.length - 1}
                  onDone={replyFinished}
                />
              ))}

              {waiting ? (
                <div className="max-w-[85%] rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/[0.06]">
                  <TypingDots label="The attending is replying" />
                </div>
              ) : null}

              {/* A failed turn sits where the answer would have been, and offers
                  the one thing that fixes it. The question above it stays put —
                  it was asked, and it is about to be asked again. */}
              {askFailure ? (
                <div className="max-w-[85%] rounded-2xl bg-[#CF7A70]/[0.08] px-4 py-3 ring-1 ring-[#CF7A70]/20">
                  <p className="text-sm leading-relaxed text-[#E0A49D]">{askFailure.message}</p>
                  <button
                    type="button"
                    onClick={() => void ask(askFailure.question)}
                    className="mt-2 text-[13px] font-semibold text-accent transition hover:text-accent-soft"
                  >
                    Ask again
                  </button>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-4 sm:p-5">
            <div className="flex items-end gap-3">
              {/* Never disabled. Disabling a field the doctor is typing in
                  hands focus back to the page, and they have to click into it
                  again to write the next question — so the box stays live and
                  writable throughout, and it is only *sending* that waits. */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter breaks the line. This is a chat,
                  // and a chat that needs a mouse to send is a form. While the
                  // attending is still answering, Enter holds rather than
                  // queues — one question at a time is how the case reads back.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!answering) void send();
                  }
                }}
                placeholder={
                  answering
                    ? "The attending is answering…"
                    : "Ask about history, exam, or request a test…"
                }
                rows={2}
                aria-label="Your message to the attending"
                className="min-h-[3rem] flex-1 resize-none rounded-2xl bg-ink-800 px-4 py-3 text-sm leading-relaxed text-white/90 outline-none ring-1 ring-white/10 transition placeholder:text-white/25 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={answering || !input.trim()}
                aria-label="Send"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/30"
              >
                <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </div>

          {/* The case controls, at the foot of the conversation rather than in a
              band of their own above the columns. That band cost about a
              hundred and twenty pixels of height on every screen and earned
              none of it, and this is where a doctor is already looking when
              they are ready to commit. */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={exit}
              className="inline-flex items-center gap-2 text-[13px] text-white/45 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              Back to Caseroom
            </button>

            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-white/40"
                title="Session time — does not affect your score"
              >
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {formatTime(elapsed)}
              </span>

              <button
                type="button"
                onClick={() => setLockInOpen(true)}
                className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                Lock in diagnosis
              </button>
            </div>
          </div>
        </Panel>

        <div className={`lg:min-h-0 ${pane === "evidence" ? "" : "hidden lg:block"}`}>
          {evidence}
        </div>
      </div>

      {lockInOpen ? (
        <LockInModal
          failure={error}
          onCancel={() => {
            setError(null);
            setLockInOpen(false);
          }}
          onSubmit={submitDiagnosis}
          submitting={evaluating}
        />
      ) : null}

      {result ? <ResultCard result={result} onClose={exit} /> : null}
    </div>
  );
}
