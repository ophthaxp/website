"use client";

import { useEffect, useState } from "react";
import { THREAD } from "./thread";
import { ThreadRail } from "./ThreadRail";
import { HorizonPanel } from "./HorizonPanel";
import { MatchedPathwayPane } from "./MatchedPathwayPane";
import { ComingSoonPane } from "./panes";
import type { PathwayMatch } from "./PathwaysPanel";
import type { OutlookSnapshot } from "@/lib/outlookSnapshot";

/**
 * Your Space: the thread on the left, the pane it selects on the right.
 *
 * **Every pane stays mounted** and the inactive ones are hidden rather than
 * unmounted. The first pane holds the ROI calculator, which by the time a
 * doctor has finished with it is carrying a specialty, a location, a radius and
 * four volume and fee figures — none of it worth losing because they glanced at
 * what else was on the thread. Hiding costs a little markup; unmounting would
 * cost them their work.
 */
export function YourSpace({
  match,
  outlook,
}: {
  match: PathwayMatch | null;
  /** The account's stored outlook. Null when there is none to hand down. */
  outlook: OutlookSnapshot | null;
}) {
  const [active, setActive] = useState(THREAD[0].key);

  /* A link elsewhere on the page can ask for a pane by name — `#horizon`,
     `#pathways`. The pane has to be shown before it can be scrolled to, so the
     scroll waits for the frame after the switch. */
  useEffect(() => {
    const apply = () => {
      const key = window.location.hash.replace("#", "");
      if (!THREAD.some((item) => item.key === key)) return;
      setActive(key);
      window.requestAnimationFrame(() => {
        document.getElementById("your-space")?.scrollIntoView();
      });
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return (
    <div className="dash-panel mt-10 grid overflow-hidden rounded-[26px] bg-ink-900/70 ring-1 ring-white/[0.08] lg:mt-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="border-b border-white/[0.07] lg:border-b-0 lg:border-r">
        <ThreadRail active={active} onSelect={setActive} />
      </div>

      <div className="min-w-0">
        {THREAD.map((item) => (
          <div
            key={item.key}
            id={`thread-pane-${item.key}`}
            role="tabpanel"
            aria-labelledby={`thread-tab-${item.key}`}
            className={item.key === active ? "h-full" : "hidden"}
          >
            {item.key === "horizon" ? (
              <HorizonPanel serverOutlook={outlook} />
            ) : item.key === "pathways" ? (
              <MatchedPathwayPane match={match} />
            ) : (
              <ComingSoonPane item={item} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
