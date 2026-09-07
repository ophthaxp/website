"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A soft terracotta light that follows the cursor across the card it sits in.
 *
 * It is a child of the card rather than the card itself on purpose. `ToolCard`
 * is a server component and is handed each tool's lucide icon as a prop — a
 * function, which cannot cross into a client component — so the card stays on
 * the server and only this one span, which needs a pointer, is shipped to the
 * browser. It lights whichever element it is dropped into: the parent supplies
 * `relative` and `overflow-hidden`, and this reads the rest off the DOM.
 *
 * Coordinates are written straight onto the element's transform rather than
 * held in a CSS variable or animated: a light that eases toward the cursor lags
 * behind it, and lag on a light reads as jank rather than as grace. Only the
 * fade in and out is timed, and it is timed slowly — the card should warm and
 * cool, not blink.
 */
export function PointerGlow() {
  const ref = useRef<HTMLSpanElement>(null);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const card = ref.current?.parentElement;
    if (!card) return;

    // A finger has no hover, so on a touchscreen this would flash a light under
    // the tap and leave it stranded there. Those devices get the card as it was.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pending = { x: 0, y: 0 };

    const move = (event: PointerEvent) => {
      const box = card.getBoundingClientRect();
      pending = { x: event.clientX - box.left, y: event.clientY - box.top };
      // Pointer events outrun the display on a fast mouse; one paint per frame
      // is all the screen can show anyway.
      if (frame === 0) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          setSpot(pending);
        });
      }
    };

    const leave = () => setSpot(null);

    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      /* Parked half its own width up and left of the card's origin, so a plain
         translate to the cursor's position centres it there — no arithmetic on
         every frame, and nothing to keep in sync if the size changes. Wide and
         weak on purpose: this is the card catching the light, not a torch beam,
         and a tighter circle would read as a cursor the browser already draws. */
      className="pointer-events-none absolute -left-56 -top-56 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.24),rgba(183,90,68,0.09)_42%,rgba(183,90,68,0)_70%)] opacity-0 transition-opacity duration-500 ease-out"
      style={{
        transform: `translate3d(${spot?.x ?? 0}px, ${spot?.y ?? 0}px, 0)`,
        opacity: spot ? 1 : 0,
      }}
    />
  );
}
