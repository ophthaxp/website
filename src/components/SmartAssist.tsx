"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, Loader2, Mic, Paperclip, Repeat2 } from "lucide-react";

const QUICK_PROMPTS = [
  "Help diagnose this retinal condition",
  "Show upcoming fellowship cohort opportunities",
  "Recommend the right fellowship program",
];

type Msg = { role: "user" | "assistant"; content: string };

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

      <div className="mt-10 flex items-center rounded-[14px] bg-ink-800 px-5 py-12 sm:mt-12 sm:px-10 sm:py-16 lg:min-h-[600px] lg:px-16">
        <div className="mx-auto flex w-full max-w-[720px] flex-col justify-center">
          {empty ? (
            <>
              <p className="text-center text-[clamp(2rem,3.6vw,3rem)] font-light leading-none text-white">
                <span className="text-white/45">Meet</span>{" "}
                <span
                  aria-hidden
                  className="relative -top-[0.04em] mx-1 inline-block text-[1.45em] leading-[0] text-accent"
                >
                  &#8734;
                </span>{" "}
                LOMA
              </p>
              <p className="mt-4 text-center text-sm text-white/40">
                Your AI mentor for clinical decisions, fellowships and lifelong learning.
              </p>
            </>
          ) : (
            <div
              ref={threadRef}
              className="mb-6 max-h-[420px] min-h-[240px] overflow-y-auto pr-1"
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

          {/* Composer */}
          <div
            className={`flex items-center gap-3 rounded-full border border-white/12 bg-[#171717] py-2 pl-2 pr-2 transition focus-within:border-accent/60 ${
              empty ? "mt-10" : "mt-0"
            }`}
          >
            <button
              type="button"
              aria-label="Attach a file"
              title="Attach"
              disabled
              className="inline-flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-ink-700 text-white/60"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask anything with LOMA..."
              aria-label="Ask LOMA"
              className="max-h-28 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] text-white placeholder:text-white/35 focus:outline-none"
            />

            <button
              type="button"
              aria-label="Voice input"
              title="Voice input"
              disabled
              className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-white/55"
            >
              <Mic className="h-[18px] w-[18px]" aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => send(input)}
              disabled={pending}
              aria-label="Send message"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent transition hover:bg-white disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
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

          {empty && (
            <ul className="mt-7 flex flex-col gap-1">
              {QUICK_PROMPTS.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => send(p)}
                    className="inline-flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[15px] text-white/55 transition hover:text-white"
                  >
                    <Repeat2 className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
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
