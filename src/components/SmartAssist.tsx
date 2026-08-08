"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { LoMaIcon } from "./LoMaIcon";

const QUICK_PROMPTS = [
  "What is OphthaXP?",
  "Compare Specialties",
  "What fits me?",
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
        body: JSON.stringify({
          message,
          history: messages,
        }),
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
      className="mx-auto max-w-[1500px] px-6 py-16 sm:px-16 sm:py-24 lg:px-24"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            <LoMaIcon className="h-3.5 w-3.5" />
            Meet LoMa
          </span>
          <h2
            id="smart-title"
            className="mt-5 font-serif text-3xl leading-tight text-white sm:text-5xl"
          >
            Smart assistance <br /> for every step.
          </h2>
          <p className="mt-5 max-w-lg text-sm text-white/60 sm:text-base">
            Ask anything about programs, outcomes, or what suits you best — with
            instant answers about mentors, cohorts, and the path that fits you.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-850/80">
        {/* Thread / welcome state */}
        <div
          ref={threadRef}
          className="max-h-[520px] min-h-[360px] overflow-y-auto px-6 py-8 sm:px-10 sm:py-12"
        >
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3">
                <LoMaIcon className="h-6 w-6" />
              </div>
              <p className="mt-5 font-serif text-2xl text-white sm:text-3xl">
                How can I assist you today?
              </p>
              <p className="mt-2 max-w-md text-sm text-white/55">
                Chat with the OphthaXP Mentor Assistant — get instant answers
                about programs, mentors, and what suits your career stage.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={
                    m.role === "user" ? "flex justify-end" : "flex justify-start"
                  }
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#ab834d] px-4 py-2.5 text-sm text-white"
                        : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/90"
                    }
                  >
                    {m.content}
                  </div>
                </li>
              ))}
              {pending && (
                <li className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking…
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 bg-ink-900/60 px-4 py-3 sm:px-6 sm:py-4">
          {empty && (
            <div className="mb-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={pending}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 transition hover:border-[#ab834d] hover:bg-[#ab834d]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-ink-950/60 px-3 py-2 focus-within:border-[#ab834d]/60">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask anything…"
              className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
              aria-label="Ask the OphthaXP assistant"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={pending || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ab834d] text-white transition hover:bg-[#8a6a40] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400/90" role="alert">
              {error}
            </p>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
