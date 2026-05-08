"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";

const INJECT_SRC = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";

const BOT_CONFIG = {
  botId: "01e2b452-472b-439a-9fa0-c8940ffdddb8",
  clientId: "e8f58e0b-936e-4b4a-8d3d-d3740723e4c6",
  configuration: {
    version: "v2",
    botName: "OphthaXP Mentor Bot",
    color: "#3978B7",
    variant: "solid",
    headerVariant: "solid",
    themeMode: "dark",
    fontFamily: "inter",
    radius: 2,
    feedbackEnabled: false,
    soundEnabled: false,
  },
};

const QUICK_PROMPTS = [
  "What is OphthaXP?",
  "Compare Specialties",
  "What fits me?",
];

declare global {
  interface Window {
    botpress?: {
      init: (config: unknown) => void;
      open: () => void;
      close: () => void;
      sendEvent: (payload: { type: string; payload?: unknown }) => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.botpress) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export function SmartAssist() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadScript(INJECT_SRC);
        if (cancelled || !window.botpress) return;
        window.botpress.on("webchat:ready", () => {
          if (!cancelled) setReady(true);
        });
        window.botpress.init(BOT_CONFIG);
      } catch (err) {
        console.error("[Botpress] failed to load", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openChat = (prompt?: string) => {
    if (!window.botpress) return;
    window.botpress.open();
    if (prompt) {
      // Best-effort: prefill via sendEvent. Safe if unsupported.
      try {
        window.botpress.sendEvent({ type: "text", payload: { text: prompt } });
      } catch {
        /* noop */
      }
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

      <div className="mt-10 rounded-3xl border border-white/10 bg-ink-850/80 p-8 sm:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3">
            <Sparkles className="h-5 w-5 text-white/80" aria-hidden />
          </div>
          <p className="mt-5 text-base text-white/85 sm:text-lg">
            How can I assist you today?
          </p>
          <p className="mt-2 max-w-md text-sm text-white/55">
            Chat with the OphthaXP Mentor Bot — get instant answers about
            programs, mentors, and what suits your career stage.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={!ready}
                onClick={() => openChat(p)}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!ready}
            onClick={() => openChat()}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MessageSquare className="h-4 w-4" />
            {ready ? "Start a conversation" : "Loading…"}
          </button>

          <p className="mt-6 text-[11px] uppercase tracking-wider text-white/40">
            Powered by Botpress
          </p>
        </div>
      </div>
    </section>
  );
}
