"use client";

import { useState } from "react";
import { Mic, Paperclip, SendHorizontal } from "lucide-react";

const QUICK_PROMPTS = [
  "What is OphthaXP?",
  "Compare Specialties",
  "What fits me?",
];

export function SmartAssist() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  const send = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message || busy) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setReply(data.reply ?? data.error ?? "Sorry, something went wrong.");
    } catch {
      setReply("Couldn't reach the assistant. Please try again.");
    } finally {
      setBusy(false);
      if (!override) setInput("");
    }
  };

  return (
    <section
      id="smart-assist"
      aria-labelledby="smart-title"
      className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="grid gap-10 sm:grid-cols-[0.9fr_1.1fr] sm:items-end">
        <div>
          <h2
            id="smart-title"
            className="font-serif text-3xl leading-tight text-white sm:text-5xl"
          >
            Smart assistance <br /> for every step.
          </h2>
        </div>
        <p className="text-sm text-white/60 sm:text-base">
          Ask anything about programs, outcomes, or what suits you best — with
          instant responses and voice-enabled interaction for a more natural
          experience.
        </p>
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-ink-850/80 p-5 sm:p-8">
        <p className="text-center text-sm text-white/70 sm:text-base">
          How Can I assist you Today?
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          className="mt-6 rounded-2xl border border-white/10 bg-ink-900 p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="ophx-chat-input" className="sr-only">
            Ask OphthaXP anything
          </label>
          <textarea
            id="ophx-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Anything..."
            rows={2}
            className="block w-full resize-none bg-transparent px-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Attach file"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Use voice input"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
              >
                <Mic className="h-3.5 w-3.5" />
                Voice
              </button>
              <button
                type="submit"
                disabled={busy || input.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </form>

        {reply && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85"
          >
            {reply}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] uppercase tracking-wider text-white/40">
          Powered By Claude
        </p>
      </div>
    </section>
  );
}
