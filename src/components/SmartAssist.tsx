"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, Loader2, Mic } from "lucide-react";

const QUICK_PROMPTS = [
  "Help diagnose this retinal condition",
  "Show upcoming fellowship cohort opportunities",
  "Recommend the right fellowship program",
];

/* Figma's mid-grey. Everything secondary inside the panel is this one value:
   the word "Meet", the placeholder, both icons in the bar, and the prompt
   rows — so it is spelled out rather than approximated with a white/NN. */
const MUTED = "#A5A5A5";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * The LOMA infinity, at heading scale. The Figma draws it 60x24 on a 6px
 * stroke, which is the 24x24 brand mark blown up 3x. The viewBox is cropped to
 * the mark's inked bounds — the full 24x24 box carries 8 units of empty space
 * above and below the glyph, which would push the two words apart and drop the
 * mark below the cap-height line it is meant to sit on.
 */
function LomaInfinity({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="1 7 22 10" fill="none" aria-hidden className={className}>
      <path
        d="M6 16C11 16 13 8 18 8C19.0609 8 20.0783 8.42143 20.8284 9.17157C21.5786 9.92172 22 10.9391 22 12C22 13.0609 21.5786 14.0783 20.8284 14.8284C20.0783 15.5786 19.0609 16 18 16C13 16 11 8 6 8C4.93913 8 3.92172 8.42143 3.17157 9.17157C2.42143 9.92172 2 10.9391 2 12C2 13.0609 2.42143 14.0783 3.17157 14.8284C3.92172 15.5786 4.93913 16 6 16Z"
        stroke="#B75A44"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The attach clip, traced from the Figma. lucide's paperclip lies on the
 * diagonal; this one stands upright — the export records a 16x16 icon frame
 * rotated -45deg, which is the designer standing the clip on end, so the
 * flattened geometry comes out with vertical stems at x 3.76 / 6.59 / 9.42 /
 * 12.24 and semicircular caps top and bottom.
 */
function AttachClipIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M6.587 4.229L6.587 10.357C6.587 10.732 6.736 11.092 7.001 11.357C7.267 11.622 7.626 11.771 8.001 11.771C8.377 11.771 8.736 11.622 9.001 11.357C9.267 11.092 9.416 10.732 9.416 10.357L9.416 4.229C9.416 3.479 9.118 2.759 8.587 2.229C8.057 1.698 7.337 1.4 6.587 1.4C5.837 1.4 5.118 1.698 4.587 2.229C4.057 2.759 3.759 3.479 3.759 4.229L3.759 10.357C3.759 11.482 4.206 12.562 5.001 13.357C5.797 14.153 6.876 14.6 8.001 14.6C9.127 14.6 10.206 14.153 11.001 13.357C11.797 12.562 12.244 11.482 12.244 10.357L12.244 4.229"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Magnifier with a sparkle in the notch — the Figma's marker for a suggested
 * search, and not a shape lucide ships. The ring deliberately breaks at the top
 * right so the sparkle sits in clear space instead of crossing it.
 */
function SuggestedSearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <g
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11.9 8A5 5 0 1 1 7 2" />
        <path d="M10.586 10.586 13.414 13.414" />
        <path d="M12.667 1.333A2 2 0 0 0 14.667 3.333A2 2 0 0 0 12.667 5.333A2 2 0 0 0 10.667 3.333A2 2 0 0 0 12.667 1.333Z" />
      </g>
    </svg>
  );
}

export function SmartAssist() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: message }];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history: messages }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Couldn't reach the assistant.");
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const empty = messages.length === 0;

  return (
    <section
      id="smart-assist"
      aria-labelledby="smart-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-24 lg:px-[120px]"
    >
      <h2
        id="smart-title"
        className="text-[clamp(1.75rem,3.1vw,2.6rem)] font-extrabold leading-tight tracking-[-0.015em] text-white"
      >
        Where Curiosity Finds Clarity
      </h2>
      <p className="mt-3 text-[15px] text-white/40">
        Ask anything. LOMA AI finds the answers that matter.
      </p>

      {/* The panel is a fixed 1200x600 in the Figma, which is exactly the
          content column at 1440 — so it only needs a height of its own once the
          section padding has stopped squeezing it. */}
      <div className="mt-10 flex items-center justify-center rounded-[12px] border border-[#4A4A4A] bg-ink-800 px-5 py-14 sm:mt-12 sm:px-10 lg:h-[600px] lg:pb-0 lg:pt-[14px]">
        <div className="w-full max-w-[720px]">
          {empty ? (
            <p className="flex items-center justify-center gap-[0.37em] text-[clamp(1.75rem,3.2vw,2.875rem)] font-semibold leading-none text-white">
              <span className="font-medium" style={{ color: MUTED }}>
                Meet
              </span>
              <LomaInfinity className="h-[0.652em] w-[1.435em] shrink-0" />
              <span>LOMA</span>
            </p>
          ) : (
            <div
              ref={threadRef}
              className="max-h-[380px] min-h-[240px] overflow-y-auto pr-1"
            >
              <ul className="flex flex-col gap-4">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white"
                          : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-ink-700 px-4 py-2.5 text-sm text-white/90"
                      }
                    >
                      {m.content}
                    </div>
                  </li>
                ))}
                {pending && (
                  <li className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-ink-700 px-4 py-2.5 text-sm text-white/60">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Thinking…
                    </div>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Composer. A 720x58 pill on a 0.5px hairline, filled a touch darker
              than the panel rather than lighter — it reads as an inset well,
              not as a raised control. */}
          <div
            className={`flex items-center gap-3 rounded-full border-[0.5px] border-[#4A4A4A] bg-black/20 px-3 py-3 transition focus-within:border-accent/60 lg:h-[58px] lg:py-0 ${
              empty ? "mt-[53px]" : "mt-6"
            }`}
          >
            <button
              type="button"
              aria-label="Attach a file"
              title="Attach"
              disabled
              style={{ color: MUTED }}
              className="inline-flex h-[34px] w-[34px] shrink-0 cursor-not-allowed items-center justify-center self-end rounded-full border-[0.5px] border-[#4A4A4A] bg-ink-800/20 shadow-[inset_1px_2px_4px_rgba(255,255,255,0.1)] lg:self-auto"
            >
              <AttachClipIcon className="h-4 w-4" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask anything with LOMA..."
              aria-label="Ask LOMA"
              className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm text-white placeholder:text-[#A5A5A5] focus:outline-none"
            />

            <button
              type="button"
              aria-label="Voice input"
              title="Voice input"
              disabled
              style={{ color: MUTED }}
              className="inline-flex h-[34px] w-[34px] shrink-0 cursor-not-allowed items-center justify-center self-end rounded-full lg:-mr-[7px] lg:self-auto"
            >
              <Mic className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            </button>

            {/* White disc, terracotta glyph — the one bright object in the
                panel, so the eye lands on it before anything else. */}
            <button
              type="button"
              onClick={() => send(input)}
              disabled={pending}
              aria-label="Send message"
              className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center self-end rounded-full bg-white text-accent transition hover:bg-accent-tint disabled:opacity-60 lg:self-auto"
            >
              {pending ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
              ) : input.trim() ? (
                <ArrowUp className="h-[18px] w-[18px]" aria-hidden />
              ) : (
                <AudioLines className="h-[18px] w-[18px]" aria-hidden />
              )}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400/90" role="alert">
              {error}
            </p>
          )}

          {/* Prompt rows. The Figma fills each row with the panel's own #1D1D1D,
              so at rest they are invisible plates running the full width of the
              bar above; the fill only earns its keep on hover. */}
          {empty && (
            <ul className="mt-3.5 flex flex-col gap-1">
              {QUICK_PROMPTS.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => send(p)}
                    style={{ color: MUTED }}
                    className="flex w-full items-center gap-[13px] rounded-lg bg-ink-800 px-4 py-3 text-left text-sm transition hover:bg-ink-700 hover:text-white lg:h-[41px] lg:py-0"
                  >
                    <SuggestedSearchIcon className="h-4 w-4 shrink-0" />
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
