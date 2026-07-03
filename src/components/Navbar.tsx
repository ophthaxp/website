import Image from "next/image";
import Link from "next/link";
import { AskLomaButton } from "./AskLomaButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black backdrop-blur-md border-b border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3 sm:px-16 lg:px-24"
      >
        <Link href="/" aria-label="OphthaXP — home" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="OphthaXP"
            width={410}
            height={74}
            priority
            className="h-[68px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop: full pill — Mobile: icon-only */}
          <AskLomaButton />
         <Link
            href="https://learn.ophthaxp.com/"
            className="rounded-[12px] bg-white px-4 py-1.5 text-xs font-semibold text-ink-950 shadow-sm transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
          >
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}
