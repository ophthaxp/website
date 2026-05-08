import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-ink-950/70 backdrop-blur-md border-b border-white/5">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8"
      >
        <Link href="/" aria-label="OphthaXP — home" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="OphthaXP"
            width={140}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="#smart-assist"
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-soft" aria-hidden />
            Ask OphthaXP
          </Link>
          <Link
            href="#get-started"
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-white/90"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
