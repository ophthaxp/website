import type { Metadata } from "next";
import { CaseroomShell } from "@/components/caseroom/CaseroomShell";

/**
 * Caseroom — practising clinical reasoning against generated patients.
 *
 * The session check is not repeated here: `account/layout.tsx` already gates
 * everything under `/account`, and a second copy of that rule is a second thing
 * to keep right.
 */
export const metadata: Metadata = {
  title: "Caseroom",
  robots: { index: false, follow: false },
};

export default function CaseroomPage() {
  return <CaseroomShell />;
}
