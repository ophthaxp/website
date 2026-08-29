import { NextResponse } from "next/server";
import { calculateRoi } from "@/lib/roiApi";
import { checkRoiGate, lockedPayload } from "@/lib/roiGate";

/**
 * The only way a browser can reach an ROI result — the backend base URL is
 * server-only, so this route is the single door, and therefore the right place
 * for the signup wall.
 *
 * The gate is checked BEFORE the calculation runs. A blocked visitor costs
 * nothing but a ledger write, and no numbers reach the client to be read out of
 * the network tab.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const pincode = String(body.pincode ?? "");

  // Counts this calculation and says whether it was allowed. `spend: true`
  // means a blocked attempt still lands on the ledger, so hammering the sliders
  // cannot outrun the tally.
  const gate = await checkRoiGate(req, pincode, { spend: true });

  if (!gate.allowed) {
    const res = NextResponse.json(lockedPayload(gate), { status: 402 });
    if (gate.deviceCookie) res.cookies.set(gate.deviceCookie);
    return res;
  }

  try {
    const data = await calculateRoi({
      specializationSlug: String(body.specializationSlug ?? ""),
      pincode,
      radiusKm: Number(body.radiusKm),
      expectedPatients: Number(body.expectedPatients),
      leadEmail:
        typeof body.leadEmail === "string" && body.leadEmail.trim()
          ? body.leadEmail.trim()
          : undefined,
    });
    const res = NextResponse.json({
      success: true,
      data,
      // Let the panel say how much is left without spending another call.
      quota: gate.gated
        ? {
            pincodesUsed: gate.pincodesUsed,
            controlChangesUsed: gate.controlChangesUsed,
            freePincodes: gate.limits.freePincodes,
            freeControlChanges: gate.limits.freeControlChanges,
          }
        : null,
    });
    if (gate.deviceCookie) res.cookies.set(gate.deviceCookie);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ROI calculation failed";
    const res = NextResponse.json({ success: false, error: message }, { status: 400 });
    if (gate.deviceCookie) res.cookies.set(gate.deviceCookie);
    return res;
  }
}
