import Image from "next/image";
import Link from "next/link";

/**
 * Certification band — a warm, lit interior with the framed certificate on the
 * right and the headline sitting in the open wall space on the left. The whole
 * card is the link target; the visible CTA is there for affordance.
 */
export function CertificatesPromo() {
  return (
    <section
      aria-labelledby="certificates-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-20 lg:px-[120px]"
    >
      <div className="relative isolate overflow-hidden rounded-[16px] bg-[linear-gradient(115deg,#efe7dc_0%,#e6dbcd_45%,#d9ccbc_100%)]">
        {/* Soft raking light from the upper right, as in the reference shot. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_55%)]"
        />
        {/* Shelf edge the frame rests on. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(to_top,rgba(120,102,84,0.28)_0%,rgba(120,102,84,0.06)_60%,rgba(120,102,84,0)_100%)]"
        />

        <div className="relative grid items-center gap-10 px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-8 lg:px-16 lg:py-20">
          {/* Left — headline */}
          <div>
            <p className="text-[clamp(1.25rem,2vw,1.75rem)] font-bold leading-tight text-[#2a2622]">
              Become part of this
            </p>
            <h2
              id="certificates-title"
              className="mt-2 font-display text-[clamp(2.25rem,4.5vw,3.5rem)] uppercase leading-[0.95] tracking-[0.005em] text-accent"
            >
              Elite Community
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#3a342d]/75">
              Train with the surgeons who defined modern ophthalmology, and earn a
              certificate that belongs on your wall — and in the trust of your patients.
            </p>
            <Link
              href="/programs"
              className="mt-8 inline-flex items-center rounded-[10px] bg-accent px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#e6dbcd]"
            >
              Explore Programs
            </Link>
          </div>

          {/* Right — the certificate. The asset is already a photograph of a
              framed award, so it gets a shadow and nothing else; adding a
              border here would read as a frame around a frame. */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative aspect-[4/3] w-full max-w-[540px] rotate-[-0.6deg] overflow-hidden rounded-[8px] shadow-[18px_26px_48px_-18px_rgba(76,62,48,0.5)]">
              <Image
                src="/Ophtha_Certificate.png"
                alt="Legends of Medicine certificate of completion, presented to a graduating fellow"
                fill
                sizes="(max-width: 1024px) 90vw, 540px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
