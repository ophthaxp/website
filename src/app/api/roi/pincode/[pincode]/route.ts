import { NextResponse } from "next/server";
import { fetchPincode } from "@/lib/roiApi";

export async function GET(
  _req: Request,
  { params }: { params: { pincode: string } },
) {
  const pincode = (params.pincode ?? "").trim();
  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { success: false, error: "pincode must be 6 digits" },
      { status: 400 },
    );
  }
  try {
    const data = await fetchPincode(pincode);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pincode lookup failed";
    const isNotFound = /not found/i.test(message);
    return NextResponse.json(
      { success: false, error: message },
      { status: isNotFound ? 404 : 502 },
    );
  }
}
