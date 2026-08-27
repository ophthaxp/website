import Image from "next/image";
import Link from "next/link";

/**
 * Certification band. On a wide screen this is the Figma exactly: one
 * photograph — a framed certificate on a sideboard in raking afternoon light —
 * in a 2.29:1 letterbox, with the two headline lines set into the empty wall on
 * the left. No scrim, no body copy, no button; the whole panel is the link.
 *
 * A phone is too narrow for that overlay — cropping to the wall loses the
 * certificate, cropping to the certificate leaves nowhere to put the words — so
 * below lg the same markup stacks instead: the full uncropped shot on top, the
 * headline beneath it on the card's own beige. One DOM tree either way, so the
 * heading keeps a single id.
 */
export function CertificatesPromo() {
  return (
    <section
      aria-labelledby="certificates-title"
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 sm:py-20 lg:px-[120px]"
    >
      <Link
        href="/programs"
        className="relative isolate block overflow-hidden rounded-[16px] bg-[#efe7dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950 lg:aspect-[1500/655]"
      >
        {/* Stacked: a 3:2 block matching the source, so nothing is cropped.
            Overlaid: fills the letterbox, and the crop takes wall off the top
            rather than trimming the sides — the Figma keeps the shot's full
            width, vase at the right edge and sideboard along the bottom. */}
        <div className="relative aspect-[3/2] w-full lg:absolute lg:inset-0 lg:aspect-auto lg:h-full">
          <Image
            src="/elite-community.png"
            alt="A Legends of Medicine certificate of completion, framed and standing on a sideboard"
            fill
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-cover object-center lg:object-[50%_66%]"
          />
        </div>

        <div className="relative px-7 py-9 sm:px-10 lg:flex lg:h-full lg:items-center lg:px-16 lg:py-0">
          <div>
            {/* Dark on the beige panel while stacked; white once it sits on the
                shadowed wall in the photo. */}
            <p className="text-[clamp(1.25rem,2.6vw,2.25rem)] font-bold leading-tight text-[#2a2622] lg:text-white">
              Become part of this
            </p>
            <h2
              id="certificates-title"
              className="mt-1 font-display text-[clamp(2.25rem,5.5vw,4.25rem)] uppercase leading-[0.95] tracking-[0.005em] text-accent"
            >
              Elite Community
            </h2>
          </div>
        </div>
      </Link>
    </section>
  );
}
