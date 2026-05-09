import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CertificatesPromo() {
  return (
    <section
      aria-labelledby="certificates-title"
      className="bg-[#ead8c0] text-[#1a1a1a]"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        {/* Left — copy + CTA */}
        <div>
          <p className="flex items-baseline gap-2 font-serif text-base font-semibold tracking-tight">
            <span>OphthaXP</span>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#1a1a1a]/85">
              Certification
            </span>
          </p>

          <h2
            id="certificates-title"
            className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Wear Your Mastery
            <br />
            with Pride
          </h2>

          <p className="mt-6 max-w-md text-base leading-relaxed text-[#1a1a1a]/75">
            Train with the surgeons who defined modern ophthalmology,
             and earn a certificate that belongs on your wall — and in the trust of your patients.
          </p>

          <Link
            href="#programs"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-black py-3 pl-6 pr-2 text-sm font-semibold text-white transition hover:bg-[#1a1a1a]"
          >
            Explore Certificates
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#c5e833] text-black">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        </div>

        {/* Right — branded preview card */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[28px] bg-[#0a0a0d] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            {/* Center brand lockup */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                OphthaXP
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.32em] text-white/90 sm:text-sm">
                Certificates
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
