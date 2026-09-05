import type { OutlookPoint } from "@/lib/outlookSnapshot";

/**
 * The catchment, drawn as a dial rather than a map.
 *
 * The real Leaflet map already exists on the calculator, and it is the right
 * thing there — a doctor sizing up a location needs to see the streets. Here
 * the question is different and smaller: *what did I last look at*. So this
 * draws the same data without pulling a tile layer, a map library and a network
 * round trip into a pane that is meant to open instantly.
 *
 * The dots are not decoration. Each one is a real pincode from that outlook,
 * placed at its true bearing and distance from the centre and sized by how much
 * of its population the circle actually covers.
 */

const SIZE = 320;
const CENTRE = SIZE / 2;
/** Pixels per one radius-length. Leaves room for centroids that sit outside. */
const UNIT = 112;
/** Beyond this the dot is pulled in to the rim, so nothing escapes the frame. */
const MAX_UNITS = 1.32;

export function OutlookDial({
  radiusKm,
  points,
}: {
  radiusKm: number;
  points: OutlookPoint[];
}) {
  const plotted = points.map((point, index) => {
    const distance = Math.hypot(point.dx, point.dy);
    // Screen y grows downward while dy is measured north, hence the negation.
    const scale = distance > MAX_UNITS ? MAX_UNITS / distance : 1;
    return {
      key: index,
      x: CENTRE + point.dx * scale * UNIT,
      y: CENTRE - point.dy * scale * UNIT,
      r: 2 + point.weight * 2.6,
      opacity: 0.35 + point.weight * 0.5,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-full w-full"
      role="img"
      aria-label={`Catchment of ${radiusKm} kilometres with ${points.length} pincodes plotted`}
    >
      <defs>
        <radialGradient id="dial-bloom">
          <stop offset="0%" stopColor="#B75A44" stopOpacity="0.42" />
          <stop offset="55%" stopColor="#B75A44" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#B75A44" stopOpacity="0" />
        </radialGradient>
        <pattern id="dial-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#FFFFFF" strokeOpacity="0.045" />
        </pattern>
      </defs>

      <rect width={SIZE} height={SIZE} fill="url(#dial-grid)" />
      <circle cx={CENTRE} cy={CENTRE} r={UNIT * 1.2} fill="url(#dial-bloom)" />

      {/* Three rings: the radius itself, solid, with a fainter one either side
          so the circle reads as a field of reach and not a hard boundary. */}
      <circle cx={CENTRE} cy={CENTRE} r={UNIT * 1.18} fill="none" stroke="#B75A44" strokeOpacity="0.14" />
      <circle cx={CENTRE} cy={CENTRE} r={UNIT} fill="none" stroke="#B75A44" strokeOpacity="0.4" />
      <circle cx={CENTRE} cy={CENTRE} r={UNIT * 0.62} fill="none" stroke="#B75A44" strokeOpacity="0.2" />

      {/* Crosshair, clipped short of the middle so it never crosses the label. */}
      <line x1="16" y1={CENTRE} x2={CENTRE - 58} y2={CENTRE} stroke="#FFFFFF" strokeOpacity="0.09" />
      <line x1={CENTRE + 58} y1={CENTRE} x2={SIZE - 16} y2={CENTRE} stroke="#FFFFFF" strokeOpacity="0.09" />

      {plotted.map((dot) => (
        <circle key={dot.key} cx={dot.x} cy={dot.y} r={dot.r} fill="#E2735A" fillOpacity={dot.opacity} />
      ))}

      <circle
        cx={CENTRE}
        cy={CENTRE}
        r="52"
        fill="#0A0A0A"
        fillOpacity="0.72"
        stroke="#B75A44"
        strokeOpacity="0.55"
      />
      <text
        x={CENTRE}
        y={CENTRE - 2}
        textAnchor="middle"
        className="fill-white font-serif"
        style={{ fontSize: "22px" }}
      >
        {radiusKm} km
      </text>
      <text
        x={CENTRE}
        y={CENTRE + 16}
        textAnchor="middle"
        className="fill-accent-soft"
        style={{ fontSize: "8.5px", letterSpacing: "0.22em" }}
      >
        CATCHMENT
      </text>
    </svg>
  );
}
