import { NextResponse } from "next/server";
import { calculateRoi } from "@/lib/roiApi";

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
  try {
    const data = await calculateRoi({
      specializationSlug: String(body.specializationSlug ?? ""),
      pincode: String(body.pincode ?? ""),
      radiusKm: Number(body.radiusKm),
      expectedPatients: Number(body.expectedPatients),
      leadEmail:
        typeof body.leadEmail === "string" && body.leadEmail.trim()
          ? body.leadEmail.trim()
          : undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ROI calculation failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
