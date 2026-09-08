import type { Metadata } from "next";
import { CasePlayer } from "@/components/caseroom/CasePlayer";

/**
 * One case, being worked.
 *
 * Its own route rather than a mode of the dashboard, so the browser's back
 * button means "leave this case" — which is what a doctor pressing it intends.
 */
export const metadata: Metadata = {
  title: "Caseroom — case in progress",
  robots: { index: false, follow: false },
};

export default function CaseroomCasePage() {
  return <CasePlayer />;
}
