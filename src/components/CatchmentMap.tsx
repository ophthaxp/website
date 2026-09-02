"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Circle, LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * The basemap: Esri's Dark Gray Canvas, in two layers — the ground, then the
 * place names over it. Both need no key.
 *
 * This has been CARTO's dark render (which now stamps "API KEY REQUIRED" over
 * keyless requests) and then plain OpenStreetMap inverted by a CSS filter. The
 * filter always looked muddy, because inverting a map drawn for white paper
 * gives you grey land and pink roads rather than a dark map. A "canvas"
 * basemap is drawn dark to begin with, and drawn deliberately plain: it exists
 * to sit under data, which is exactly this panel's job.
 *
 * Note the {y}/{x} order — Esri's REST tiles are row-then-column, the reverse of
 * the usual XYZ scheme. Their Dark Gray Canvas stops at zoom 16; the radius here
 * runs 1-100km, which never needs closer.
 *
 * Like every keyless source this runs on fair use, not a licence for commercial
 * traffic. Before real volume it wants a paid or self-hosted source — that is
 * this object and nothing else.
 */
const TILES = {
  base: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  labels:
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  attribution:
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  maxZoom: 16,
};

type LeafletApi = typeof Leaflet;

/**
 * Leaflet ships a UMD build, so it reaches the bundler as CommonJS and the whole
 * library arrives as the namespace's `default` — while the typings describe it
 * as named exports and declare no default at all. Both shapes are handled here
 * once, rather than casting at each call site.
 */
async function loadLeaflet(): Promise<LeafletApi> {
  const mod = await import("leaflet");
  return (mod as unknown as { default?: LeafletApi }).default ?? (mod as unknown as LeafletApi);
}

const CIRCLE_COLOR = "#297DEA";
const PIN_COLOR = "#6B7280";

/**
 * The id the catchment circle's fill points at. One gradient serves every map on
 * the page: `fill: url(#id)` resolves against the document, not the SVG it sits
 * in, so the defs can live outside Leaflet's own overlay — which Leaflet rebuilds
 * whenever it feels like it.
 */
const GLOW_ID = "roi-catchment-glow";

/**
 * A pane of the ping's own, sitting between the tiles (200) and the catchment
 * overlay (400). The ring washes over the map and passes under the circle, the
 * pincode dots and the place names — it is the quietest thing on the panel and
 * must not paint over the things that carry the numbers.
 */
const PULSE_PANE = "roiPulse";

export interface CatchmentPoint {
  pincode: string;
  /** Already cleaned for display — the map does no formatting of its own. */
  label: string;
  lat: number;
  lon: number;
  exposurePct: number;
  /** Pre-formatted head-count for the tooltip, e.g. "1.2 L". */
  people: string;
  /** The same figure unformatted — the dot is sized from it. */
  peopleCount: number;
  isHome: boolean;
}

/**
 * The catchment drawn on a real map: the serviceable circle at true scale, over
 * the pincodes it reaches. Every coordinate comes from the same backend that
 * produced the numbers beside it, so the picture and the table cannot disagree.
 *
 * Leaflet is loaded inside the effect rather than imported at the top: it
 * touches `window` while evaluating, which throws during server rendering.
 */
export function CatchmentMap({
  center,
  radiusKm,
  points,
  className,
}: {
  center: { lat: number; lon: number } | null;
  radiusKm: number;
  points: CatchmentPoint[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const pinsRef = useRef<LayerGroup | null>(null);
  const pulseRef = useRef<Marker | null>(null);
  /** Shown for a moment when a bare wheel goes by, then it gets out of the way. */
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number | undefined>(undefined);
  // Read by the async setup below, which may resolve after a prop has changed.
  const latest = useRef({ center, radiusKm, points });
  latest.current = { center, radiusKm, points };

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let host: HTMLDivElement | null = null;
    let onWheel: ((e: WheelEvent) => void) | undefined;

    (async () => {
      const L = await loadLeaflet();
      host = hostRef.current;
      if (cancelled || !host) return;

      const map = L.map(host, {
        // The panel sits mid-page: a wheel over it should scroll the page, not
        // zoom the map. Zoom stays available on the control and by double-click.
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: true,
        center: [20.5937, 78.9629], // India, until the first result lands
        zoom: 5,
      });
      // Leaflet's default prefix is a flag emoji and a link to itself. The OSM
      // and CARTO credits below are the ones actually required; keep the library
      // credit, drop the decoration.
      map.attributionControl.setPrefix(
        '<a href="https://leafletjs.com/">Leaflet</a>',
      );
      L.tileLayer(TILES.base, {
        attribution: TILES.attribution,
        maxZoom: TILES.maxZoom,
      }).addTo(map);
      // Place names ride above the catchment overlay rather than under it: the
      // name hidden behind a pincode dot is the one the reader wanted to read.
      L.tileLayer(TILES.labels, {
        maxZoom: TILES.maxZoom,
        pane: "markerPane",
      }).addTo(map);
      // Bottom right, clear of the radius buttons in the opposite corner.
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const pulsePane = map.createPane(PULSE_PANE);
      pulsePane.style.zIndex = "350";
      pulsePane.style.pointerEvents = "none";
      // The ping is sized in pixels, so it has to be re-measured whenever the
      // scale changes. Leaflet transforms the whole pane during the animation
      // itself, which carries the ring along at the right size until it lands.
      map.on("zoomend", sizePulse);

      // Zooming, without stealing the page's scroll.
      //
      // A bare wheel keeps scrolling the page: this panel sits mid-page and a
      // map that swallows the wheel traps the reader inside it. Holding the
      // modifier zooms the map instead — the convention embedded maps have used
      // for years, and the same gesture a trackpad pinch sends, which is why a
      // pinch here used to zoom the whole browser. Leaflet's own handler cannot
      // be asked for a modifier, so the wheel is read directly.
      const mac = /Mac|iPhone|iPad/.test(navigator.platform);
      let travel = 0;
      let settle: number | undefined;
      onWheel = (e: WheelEvent) => {
        if (!(e.ctrlKey || e.metaKey)) {
          setHint(mac ? "Hold ⌘ and scroll to zoom" : "Hold Ctrl and scroll to zoom");
          window.clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHint(null), 1600);
          return;
        }
        // Without this the browser zooms the document instead.
        e.preventDefault();
        setHint(null);
        // A mouse sends a few big steps and a trackpad a stream of small ones,
        // so the travel is banked and cashed in once it stops: ~60 units to a
        // zoom level, which is one notch of a typical wheel.
        travel += e.deltaY;
        const at = map.mouseEventToContainerPoint(e);
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          const by = Math.round(-travel / 60);
          travel = 0;
          if (by !== 0) map.setZoomAround(at, map.getZoom() + by);
        }, 40);
      };
      // Not passive: a passive listener is forbidden from preventing the
      // browser's own zoom, which is the whole point of the branch above.
      host.addEventListener("wheel", onWheel, { passive: false });

      mapRef.current = map;
      pinsRef.current = L.layerGroup().addTo(map);
      draw(L);

      // Leaflet measures its container once, at creation. This panel is a flex
      // child whose height moves as results load and as the layout breaks to one
      // column, and a map that missed the change renders grey where tiles should
      // be until something else nudges it.
      observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
      observer.observe(host);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (onWheel) host?.removeEventListener("wheel", onWheel);
      window.clearTimeout(hintTimer.current);
      mapRef.current?.remove();
      mapRef.current = null;
      circleRef.current = null;
      pinsRef.current = null;
      pulseRef.current = null;
    };
    // Runs once: the map is created here and then updated in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Stretch the ping to the catchment ring, in pixels at the current zoom. The
   * rings animate from nothing to this width, so the wave dies exactly on the
   * dashed circle rather than at some fixed size that means nothing at 1km and
   * nothing at 100km either.
   */
  function sizePulse() {
    const map = mapRef.current;
    const circle = circleRef.current;
    const el = pulseRef.current?.getElement();
    if (!map || !circle || !el) return;
    const bounds = circle.getBounds();
    const { lat } = circle.getLatLng();
    const west = map.latLngToContainerPoint([lat, bounds.getWest()]);
    const east = map.latLngToContainerPoint([lat, bounds.getEast()]);
    el.style.setProperty("--roi-pulse", `${Math.abs(east.x - west.x)}px`);
  }

  /** Redraw the circle and the pins from whatever the latest props are. */
  async function draw(preloaded?: LeafletApi) {
    const map = mapRef.current;
    if (!map) return;
    const L = preloaded ?? (await loadLeaflet());
    const { center: c, radiusKm: r, points: pts } = latest.current;
    if (!c) return;

    if (circleRef.current) {
      circleRef.current.setLatLng([c.lat, c.lon]).setRadius(r * 1000);
    } else {
      circleRef.current = L.circle([c.lat, c.lon], {
        radius: r * 1000,
        color: CIRCLE_COLOR,
        weight: 2,
        dashArray: "6 5",
        // The flat wash is the fallback. `.roi-catchment` swaps it for the
        // gradient below, and a stylesheet rule outranks the fill attribute
        // Leaflet writes, so the two do not fight. Opacity is left at 1 because
        // fill-opacity multiplies the gradient's own stops; the fade is carried
        // by the stops alone.
        className: "roi-catchment",
        fillColor: CIRCLE_COLOR,
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    }

    // Three rings breaking out of the practice, one behind the other. A marker
    // rather than a drawn shape: this is CSS animation, and Leaflet keeps the
    // element pinned to its coordinate through every pan and zoom for free.
    if (pulseRef.current) {
      pulseRef.current.setLatLng([c.lat, c.lon]);
    } else {
      pulseRef.current = L.marker([c.lat, c.lon], {
        pane: PULSE_PANE,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "roi-pulse",
          html: "<i></i><i></i><i></i>",
          // Zero-sized and anchored dead on the point; the rings are centred on
          // it by CSS, which is also what animates them.
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(map);
    }
    sizePulse();

    const pins = pinsRef.current;
    if (pins) {
      pins.clearLayers();
      // Sized by head-count rather than coverage: a dense catchment is mostly
      // 100%-covered pincodes, and sizing by coverage made every one of them the
      // same large dot — 123 identical circles that merged into a blob. Area
      // tracks people, so the square root of the share sets the radius.
      const maxPeople = Math.max(1, ...pts.map((p) => p.peopleCount));
      // Largest first, so the small ones stay hoverable on top of them.
      const ordered = [...pts].sort((a, b) => b.peopleCount - a.peopleCount);
      for (const p of ordered) {
        // Every other pincode is plotted at its geometric centroid, the point the
        // distance column measures to. Your own is plotted at the centre the
        // catchment was measured from instead — the population-weighted one. The
        // two are ~0.4km apart, enough to leave the "you" dot visibly off the
        // centre of its own circle at a small radius.
        const at: [number, number] = p.isHome ? [c.lat, c.lon] : [p.lat, p.lon];
        const marker = L.circleMarker(at, {
          radius: p.isHome ? 6 : 2 + Math.sqrt(p.peopleCount / maxPeople) * 5,
          color: p.isHome ? "#ffffff" : PIN_COLOR,
          weight: p.isHome ? 2 : 0.75,
          fillColor: p.isHome ? CIRCLE_COLOR : PIN_COLOR,
          fillOpacity: 0.2 + (p.exposurePct / 100) * 0.4,
        });
        marker.bindTooltip(
          `<b>${p.label}</b><br>${p.pincode} · ${
            p.exposurePct >= 99.95 ? "100" : p.exposurePct.toFixed(1)
          }% covered · ${p.people} people`,
          { direction: "top", offset: [0, -4] },
        );
        marker.addTo(pins);
      }
    }

    // Refit on every change: the radius moving is exactly when the view should
    // follow, even if the reader has panned away.
    const bounds = circleRef.current?.getBounds();
    if (bounds) map.fitBounds(bounds, { padding: [28, 28], animate: false });
    // Again, now the view has settled: a refit that only panned changes the
    // pixels under the ring without ever firing a zoom event.
    sizePulse();
  }

  // Redraw whenever the catchment changes. `points` is a fresh array each
  // render, so the dependency is its content, not its identity.
  const pointsKey = points.map((p) => `${p.pincode}:${p.peopleCount}`).join(",");
  useEffect(() => {
    void draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lon, radiusKm, pointsKey]);

  return (
    <>
      {/* The catchment's glow. Object bounding-box units are the default, so the
          gradient is measured against the circle itself: it stays centred on the
          practice and reaches the ring at every zoom, with no redraw. Taken off
          the Figma marker — the same blue, brightest under the pin and thinned
          to almost nothing by the time it meets the dashed edge. */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          <radialGradient id={GLOW_ID}>
            <stop offset="0" stopColor={CIRCLE_COLOR} stopOpacity="0.34" />
            <stop offset="0.35" stopColor={CIRCLE_COLOR} stopOpacity="0.2" />
            <stop offset="0.7" stopColor={CIRCLE_COLOR} stopOpacity="0.09" />
            <stop offset="1" stopColor={CIRCLE_COLOR} stopOpacity="0.03" />
          </radialGradient>
        </defs>
      </svg>
      <div
        ref={hostRef}
        className={`roi-map h-full w-full ${className ?? ""}`}
        role="img"
        aria-label={
          center
            ? `Map of the ${radiusKm} kilometre catchment, showing ${points.length} pincodes`
            : "Catchment map"
        }
      />

      {/* Above the map's own controls, and untouchable — it is a caption, not a
          thing to dismiss. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[1200] flex items-center justify-center transition-opacity duration-200 ${
          hint ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full bg-black/75 px-4 py-2 text-[13px] text-white backdrop-blur-sm">
          {hint}
        </span>
      </div>
    </>
  );
}
