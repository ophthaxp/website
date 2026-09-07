import Image from "next/image";

/**
 * The certificate itself: a photograph of a framed plate, with everything
 * printed on it drawn over the top as live text.
 *
 * Lifted out of `CertificatesPromo`, which was the only thing that could show a
 * certificate for as long as the certificate was part of that band's markup.
 * The programme pages want the same plate — made out to whoever is signed in,
 * signed by the Legend teaching that programme — and they are not a promo, so
 * the artwork lives here and the band keeps only its own framing and headline.
 *
 * **Nothing on the certificate is painted into the photograph.** The plate has
 * been retouched back to an empty gold-ruled frame, and the logo, the two title
 * lines, the reader's name and the signature block are all drawn over it as
 * live text. Three reasons, in order of how much they matter:
 *
 *   1. What was printed there was wrong. The lockup was an eye mark over
 *      "LEGENDS OF MEDICINE" set in a face the brand does not use, and the seal
 *      repeated it; neither is the logo. It is now the real one.
 *   2. It was signed "Dr. Rohit Menon, Cornea Surgeon & Mentor" — an invented
 *      person, under an invented hand. A credential should not carry a
 *      signature nobody wrote. See `HOUSE_SIGNATORY`.
 *   3. Baked words are a photograph of type: soft at any size, softer once the
 *      shot is scaled and re-encoded. Text stays sharp on every screen, and it
 *      can be read, translated and searched.
 *
 * `fill` on the picture, so every caller has to give this a positioned box. The
 * box is what decides the crop; this only fills it.
 */

/** What a stranger sees where a signed-in reader sees themselves. */
export const SAMPLE_NAME = "Dr. Aarav Sharma";

export interface Signatory {
  name: string;
  role: string;
}

/**
 * Who signs it when nobody in particular does.
 *
 * A real Legend from the roster, chosen by the team — not the invented
 * "Dr. Rohit Menon" this replaced. The hand above the rule is his name set in
 * roundhand, not a reproduction of his writing; if he sends a scan, swap the
 * `<text>` in the signature block for it and this stays as the printed line.
 *
 * Both lines move together. A signature that does not match the name typed
 * under it is the fault the old plate had. That is also why a programme page
 * passes its own mentor rather than leaving this one in place: the certificate
 * a programme awards is signed by the Legend who taught it.
 */
export const HOUSE_SIGNATORY: Signatory = {
  name: "Dr. Srinivas K Rao",
  role: "Cornea & Cataract Specialist",
};

/**
 * The title line, kept to the width of the rule above it.
 *
 * Same trick as the recipient's name and for the same reason — there is no
 * measuring text on the server. "Cornea & Cataract Specialist" is half as long
 * again as the line it replaced, so without this it runs out past the rule at
 * both ends and stops looking like a caption.
 */
const ROLE_MAX_W = 146;
function roleFit(role: string): { size: number; length?: number } {
  const natural = role.length * 6.35;
  if (natural <= ROLE_MAX_W) return { size: 9 };
  return { size: Math.max(6.6, (9 * ROLE_MAX_W) / natural), length: ROLE_MAX_W };
}

/*
 * ---------------------------------------------------------------------------
 * Where everything goes.
 *
 * All of it in the photograph's own pixels, 1536 x 1024, measured off the plate
 * before it was cleared: the overlay is an SVG with that exact viewBox laid
 * over the picture, so these numbers go in unconverted and scale with the shot
 * through every breakpoint. Y values are baselines, X values are centres.
 *
 * The plate is very slightly off-square in the shot — a 0.22 degree lean fitted
 * across the printed name and the title above it. Each line is rotated about
 * its own anchor rather than the whole group about the plate: the coordinates
 * below were measured in place and already carry the lean, so turning them
 * again around a distant centre would slide them off it.
 * ---------------------------------------------------------------------------
 */
const TILT = -0.22;

/** Gold as the frame is printed; the rules a touch deeper so type leads. */
const GOLD = "#ECD3A5";
const GOLD_RULE = "#C9A96E";

const SERIF = 'var(--font-playfair), "Times New Roman", Times, serif';
/** English roundhand, for the one line above the rule. */
const SCRIPT = 'var(--font-signature), "Segoe Script", cursive';

/** The lockup, in the band the old eye mark and its wordmark used to fill. */
const LOGO = { cx: 1042.5, cy: 506, h: 66, w: 66 * (623 / 290) };

/**
 * Long names, kept inside the frame.
 *
 * There is no measuring text on the server, so this estimates and then hands
 * the answer to `textLength`, which does not estimate: names past the fitting
 * width are set to exactly that width by opening or closing the spacing, never
 * by squeezing the letterforms. Short names are left alone — stretching
 * "Dr. Ravi Shah" across 380px to fill a box would look like a mistake.
 */
const NAME_SIZE = 30.5;
const NAME_MAX_W = 380;
function nameFit(name: string): { size: number; length?: number } {
  const natural = 0.5 * name.length * NAME_SIZE;
  if (natural <= NAME_MAX_W) return { size: NAME_SIZE };
  // Shrink first, and only track in what shrinking alone cannot recover, so a
  // very long name stays the same colour of type as a short one.
  const size = Math.max(NAME_SIZE * 0.7, NAME_MAX_W / (0.5 * name.length));
  return { size, length: NAME_MAX_W };
}

/** "Dr." unless they have titled themselves already. */
export function certificateName(first?: string, last?: string): string {
  const full = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!full) return SAMPLE_NAME;
  return /^(dr|prof|mr|mrs|ms)\b\.?/i.test(full) ? full : `Dr. ${full}`;
}

/**
 * The house seal, bottom right — the ring the wrong eye mark used to sit in.
 *
 * ## Why the two arcs are not the same circle
 *
 * A textPath puts the baseline on the path and stacks the letter *away from the
 * path's left-hand side*. Both arcs here run left to right so that both words
 * stand up the same way round, and that has a consequence which is easy to miss
 * and obvious once it bites: over the crown the letters grow **outward**, under
 * the base they grow **inward**. One shared radius therefore cannot centre
 * both — put the pair on 0.80r and "LEGENDS" sits comfortably while
 * "OF MEDICINE" is pushed down onto the inner ring, which is exactly what it
 * did.
 *
 * So the band the letters occupy is what is held constant, and each arc gets
 * whichever edge of it is its own baseline:
 *
 *   outer ring        r                    the seal's edge
 *   foot baseline     0.92r  ─┐            the base word hangs inward from here
 *   letter band       0.11r   │ cap height, the same annulus for both words
 *   crown baseline    0.81r  ─┘            the crown word grows outward from here
 *   inner ring        0.735r               about 3 clear under the band
 *   the mark          0.40r tall, centred  well inside the inner ring
 *
 * The stops sit on the middle of that band, where the two arcs pass each other.
 */
function Seal({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const size = r * 0.15; // cap height lands near 0.7 of this
  const rCrown = r * 0.81; // baseline of the word over the crown
  const rFoot = r * 0.92; // baseline of the word under the base
  const rStop = (rCrown + rFoot) / 2;
  const bar = r * 0.4; // the mark's height at the centre
  const k = bar / 400; // the icon artboard is 222 x 400
  return (
    <g transform={`rotate(${TILT} ${cx} ${cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GOLD_RULE} strokeWidth={1.3} />
      <circle cx={cx} cy={cy} r={r * 0.735} fill="none" stroke={GOLD_RULE} strokeWidth={0.6} />
      {/* Two full stops on the equator, level with the middle of the band. */}
      <circle cx={cx - rStop} cy={cy} r={1.1} fill={GOLD_RULE} />
      <circle cx={cx + rStop} cy={cy} r={1.1} fill={GOLD_RULE} />
      <defs>
        {/* Sweep 1 is the clockwise side on a y-down grid, so from the left-hand
            end that is the way over the crown; sweep 0 from the same end is the
            way under the base. Both therefore run left to right and both words
            read upright — flip the foot to sweep 1 and it hangs upside down. */}
        <path
          id={`seal-top-${cx}`}
          d={`M ${cx - rCrown} ${cy} A ${rCrown} ${rCrown} 0 0 1 ${cx + rCrown} ${cy}`}
        />
        <path
          id={`seal-foot-${cx}`}
          d={`M ${cx - rFoot} ${cy} A ${rFoot} ${rFoot} 0 0 0 ${cx + rFoot} ${cy}`}
        />
      </defs>
      <text
        fill={GOLD}
        fontSize={size}
        letterSpacing={size * 0.2}
        style={{ fontFamily: SERIF }}
        textAnchor="middle"
      >
        <textPath href={`#seal-top-${cx}`} startOffset="50%">
          LEGENDS
        </textPath>
      </text>
      <text
        fill={GOLD}
        fontSize={size}
        letterSpacing={size * 0.2}
        style={{ fontFamily: SERIF }}
        textAnchor="middle"
      >
        {/* The foot arc starts at the left and runs under the base, so the
            middle of the word lands at the bottom of the ring. */}
        <textPath href={`#seal-foot-${cx}`} startOffset="50%">
          OF MEDICINE
        </textPath>
      </text>
      {/* The mark itself, from brand/lom-icon-mono.svg, in the seal's gold. */}
      <g transform={`translate(${cx - (222 * k) / 2} ${cy - bar / 2}) scale(${k})`} fill={GOLD}>
        <path d="M58 0 L0 58 L0 400 L58 342 Z" opacity=".62" />
        <path d="M222 0 L164 58 L164 400 L222 342 Z" />
      </g>
    </g>
  );
}

export function CertificatePlate({
  name,
  signatory = HOUSE_SIGNATORY,
  /**
   * Left empty by default. Two of these can share a page, and the picture is
   * decoration wherever the name on it is already written in the copy beside
   * it — the promo band says it in the link's own name, so a second reading
   * would land in the middle of that one.
   */
  alt = "",
}: {
  name: string;
  signatory?: Signatory;
  alt?: string;
}) {
  const fit = nameFit(name);
  const role = roleFit(signatory.role);

  return (
    <>
      {/* -v3 is the same photograph with the plate cleared: name, lockup, both
          title lines, the signature block and the seal all painted out, the gold
          border and its corner ornaments left alone. The file had to change its
          name to change its URL — the image optimiser caches by URL, so editing
          it in place kept serving the old picture, printed words and all,
          underneath this one. Any future retouch needs a new filename for the
          same reason. */}
      <Image
        src="/elite-community-v3.png"
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 1200px"
        className="object-cover"
      />
      {/* The viewBox is the photograph's pixel grid, so the measurements at the
          top of this file are the coordinates used here. */}
      <svg
        aria-hidden
        viewBox="0 0 1536 1024"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          {/* The lockup ships white-on-transparent with a tan rule and
              strapline — right for the site's black header, wrong here, where it
              would be the one thing on the plate that is not stamped in gold.
              This throws away the colour and keeps the shape: every channel is
              set to the gold, alpha is passed through untouched. A mask would do
              the same job but needs `mask-type: alpha` to stop the tan reading
              as half-strength, and this needs nothing. sRGB because the default
              linearRGB would lighten the constant it is being handed. */}
          <filter id="cert-foil" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.925  0 0 0 0 0.827  0 0 0 0 0.647  0 0 0 1 0"
            />
          </filter>
        </defs>
        <image
          href="/brand/lom-logo-full.png"
          x={LOGO.cx - LOGO.w / 2}
          y={LOGO.cy - LOGO.h / 2}
          width={LOGO.w}
          height={LOGO.h}
          filter="url(#cert-foil)"
          transform={`rotate(${TILT} ${LOGO.cx} ${LOGO.cy})`}
        />

        <text
          x={1043}
          y={584}
          fill={GOLD}
          fontSize={26}
          fontWeight={600}
          textLength={430}
          lengthAdjust="spacing"
          textAnchor="middle"
          style={{ fontFamily: SERIF }}
          transform={`rotate(${TILT} 1043 584)`}
        >
          CERTIFICATE OF COMPLETION
        </text>

        <text
          x={1047.5}
          y={612}
          fill={GOLD}
          fillOpacity={0.82}
          fontSize={12}
          textLength={92}
          lengthAdjust="spacing"
          textAnchor="middle"
          style={{ fontFamily: SERIF }}
          transform={`rotate(${TILT} 1047.5 612)`}
        >
          PRESENTED TO
        </text>

        <text
          x={1044}
          y={646}
          fill={GOLD}
          fontSize={fit.size}
          textLength={fit.length}
          lengthAdjust={fit.length ? "spacing" : undefined}
          textAnchor="middle"
          style={{ fontFamily: SERIF }}
          transform={`rotate(${TILT} 1044 646)`}
        >
          {name}
        </text>

        {/* Signature block: a hand, a rule, and the name and title under it, in
            the space the invented squiggle used to fill.

            The hand is the signatory's own name set in a roundhand script, not a
            scan and not a drawing of somebody's writing. That is the honest
            version of this: it signs in the name that is printed underneath, so
            the two can never disagree, and it cannot be mistaken for a
            reproduction of a real person's signature the way the squiggle here
            before it was. A scanned hand can replace it the day a Legend sends
            one. */}
        <g transform={`rotate(${TILT} 923 745)`}>
          {/* Sized and lifted so the roundhand's descenders clear the rule
              rather than striking through it, and left free to overhang the rule
              at both ends, which is what a signature does. */}
          <text
            x={923}
            y={717}
            fill={GOLD}
            fontSize={24}
            textAnchor="middle"
            style={{ fontFamily: SCRIPT }}
          >
            {signatory.name}
          </text>
          <line
            x1={850}
            y1={731}
            x2={996}
            y2={731}
            stroke={GOLD_RULE}
            strokeWidth={0.9}
            strokeDasharray="1.6 2.4"
            opacity={0.8}
          />
          <text
            x={923}
            y={751}
            fill={GOLD}
            fontSize={15}
            textAnchor="middle"
            style={{ fontFamily: SERIF }}
          >
            {signatory.name}
          </text>
          <text
            x={923}
            y={766}
            fill={GOLD}
            fillOpacity={0.78}
            fontSize={role.size}
            letterSpacing={1.2}
            textLength={role.length}
            lengthAdjust={role.length ? "spacing" : undefined}
            textAnchor="middle"
            style={{ fontFamily: SERIF }}
          >
            {signatory.role.toUpperCase()}
          </text>
        </g>

        <Seal cx={1198.5} cy={719} r={48} />
      </svg>
    </>
  );
}
