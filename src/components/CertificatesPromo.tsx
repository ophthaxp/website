import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";

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
 *
 * Signed in, the certificate is made out to the reader. The name used to be
 * painted into the photograph; it has been painted back out, and is printed
 * over the frame as live text instead. The page is force-dynamic already, so
 * the session is read here on the server and the right name is in the first
 * HTML — no fetch after hydration, and no flash of somebody else's name.
 */

/** What the photograph itself used to say, and what a stranger still sees. */
const SAMPLE_NAME = "Dr. Aarav Sharma";

/*
 * Where the name goes, measured off the original photograph before the name was
 * painted out of it. All of it in the source frame's own pixels, 1536 × 1024:
 *
 *   glyphs        x 935 → 1162, cap top 625, baseline 646
 *   panel it sits in   x 802 → 1286, so its centre is 1044
 *   baseline tilt      −0.22°, fitted across the name and the headline above it
 *
 * Percentages of the picture, not of the card — which is why the picture below
 * is laid out in a box of its own shape and the crop is done by hand. The
 * lengths are cqw, 1% of that box's width, so the printing tracks the photo
 * through every breakpoint.
 */
const NAME_CENTRE_X = (1044 / 1536) * 100; // 67.97%
const NAME_CENTRE_Y = (635.5 / 1024) * 100; // 62.06% — midway up the capitals
const NAME_TILT_DEG = -0.22;
/**
 * Cap height was 20px and the name ran 227px wide. Set in Times New Roman —
 * near enough the face in the photograph — 30px gives 221px and a 20px cap,
 * 31px gives 227px and 21px, so the size lies between them.
 */
const NAME_SIZE_CQW = (30.5 / 1536) * 100;
/** 380px of the panel's 484: past that the name starts crowding the gold rule. */
const NAME_MAX_CQW = (380 / 1536) * 100;

/**
 * Long names, shrunk to stay inside the frame. There is no measuring the text
 * on the server, so this estimates: doctors' names in Times run about 0.46em a
 * character — 0.455 for "Dr. Aarav Sharma", 0.449 for "Dr. Venkataraghavan
 * Balasubramanian", 0.433 for "Dr. Priya Krishnamurthy". Anything up to about
 * 27 characters is printed full size. The floor at 70% keeps a very long name
 * legible; it still has 484px of panel to overrun into, not 380.
 */
function fittedSizeCqw(name: string): number {
  const estimatedEms = 0.46 * name.length;
  return Math.max(
    NAME_SIZE_CQW * 0.7,
    Math.min(NAME_SIZE_CQW, NAME_MAX_CQW / estimatedEms),
  );
}

/** "Dr." unless they have titled themselves already. */
function certificateName(first?: string, last?: string): string {
  const full = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!full) return SAMPLE_NAME;
  return /^(dr|prof|mr|mrs|ms)\b\.?/i.test(full) ? full : `Dr. ${full}`;
}

export function CertificatesPromo() {
  const user = getSessionUser();
  const name = certificateName(user?.firstName, user?.lastName);

  return (
    <section
      aria-labelledby="certificates-title"
      className="mx-auto max-w-[1440px] px-5 py-12 sm:px-10 sm:py-14 lg:px-[120px]"
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
          {/* The picture gets a box of its own 3:2 shape, and the cover crop is
              arithmetic rather than object-fit: a percentage inside this box is
              then a percentage of the photograph, which is how the name finds
              the frame. object-cover crops inside the <img>, where nothing laid
              over it can follow. Below lg the card is already 3:2 and there is
              nothing to crop; on lg it is a 2.29:1 letterbox, so the picture
              stands 2.29/1.5 as tall and rides up 66% of the overflow — the
              framing object-[50%_66%] used to give. */}
          <div
            className="absolute inset-x-0 top-0 aspect-[3/2] lg:top-[-34.763%] lg:h-[152.672%] lg:aspect-auto"
            style={{ containerType: "inline-size" }}
          >
            {/* -v2 is the same photograph with the name painted out of it.
                The file had to change its name to change its URL: the image
                optimiser caches by URL, so editing it in place kept serving the
                old picture — printed name and all — underneath this one. Any
                future retouch needs a new filename for the same reason. */}
            <Image
              src="/elite-community-v2.png"
              alt={`A Legends of Medicine certificate of completion made out to ${name}, framed and standing on a sideboard`}
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover"
            />
            {/* Read out in the alt above rather than twice over: on its own it
                would land in the middle of the link's own name. */}
            <span
              aria-hidden
              className="pointer-events-none absolute whitespace-nowrap font-normal leading-none text-[#ECD3A5]"
              style={{
                left: `${NAME_CENTRE_X}%`,
                top: `${NAME_CENTRE_Y}%`,
                fontSize: `${fittedSizeCqw(name)}cqw`,
                fontFamily: '"Times New Roman", Times, serif',
                transform: `translate(-50%, -50%) rotate(${NAME_TILT_DEG}deg)`,
              }}
            >
              {name}
            </span>
          </div>
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
