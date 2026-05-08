import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-ink-950/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 sm:flex-row sm:px-8">
        {/* Left: logo pill + copyright */}
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="OphthaXP home" className="inline-flex items-center">
            <Image
              src="/logo.png"
              alt="OphthaXP"
              width={140}
              height={36}
              className="h-9 w-auto"
            />
          </Link>
          <span className="text-sm text-white/70">
            <span aria-hidden>©</span> {year}
          </span>
        </div>

        {/* Center: legal links */}
        <nav aria-label="Footer legal links" className="flex items-center gap-8 text-sm text-white/70">
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Term Of Services
          </Link>
        </nav>

        {/* Right: social icons */}
        <div className="flex items-center gap-3">
          <Link
            href="https://x.com/"
            aria-label="OphthaXP on X"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-90"
          >
            <Twitter className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="https://www.linkedin.com/"
            aria-label="OphthaXP on LinkedIn"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-90"
          >
            <Linkedin className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="https://www.instagram.com/"
            aria-label="OphthaXP on Instagram"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-90"
          >
            <Instagram className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </footer>
  );
}
