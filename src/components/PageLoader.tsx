import Image from "next/image";

export function PageLoader({ label = "Preparing your experience" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-ink-950"
    >
      {/* Top progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-white/5">
        <div className="loader-progress h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-accent-soft" />
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft/10 blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 70%)",
        }}
      />

      {/* Centered brand stack */}
      <div className="relative flex flex-col items-center gap-7">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* Outer rotating arc */}
          <span className="absolute inset-0 animate-[loader-spin_2.4s_linear_infinite] rounded-full border border-transparent [border-top-color:theme(colors.accent.DEFAULT)] [border-right-color:rgba(124,92,255,0.35)]" />
          {/* Inner reverse arc */}
          <span className="absolute inset-3 animate-[loader-spin-reverse_3.2s_linear_infinite] rounded-full border border-transparent [border-bottom-color:theme(colors.accent.soft)] [border-left-color:rgba(167,139,250,0.25)]" />
          {/* Soft glow ring */}
          <span className="absolute inset-5 rounded-full bg-accent/15 blur-md" />
          {/* Logo */}
          <Image
            src="/logo.png"
            alt=""
            width={120}
            height={120}
            priority
            className="relative h-12 w-12 object-contain opacity-90 [animation:loader-pulse_2.4s_ease-in-out_infinite]"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="loader-shimmer font-serif text-2xl tracking-wide sm:text-3xl">
            OphthaXP
          </h2>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/45">
            <span className="h-[3px] w-3 rounded-full bg-accent/70" />
            <span>{label}</span>
            <span className="h-[3px] w-3 rounded-full bg-accent/70" />
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="loader-dot h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="loader-dot loader-dot-2 h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="loader-dot loader-dot-3 h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
