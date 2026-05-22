import { NextResponse } from "next/server";
import { fetchSpecializations } from "@/lib/roiApi";

export async function GET() {
  try {
    const data = await fetchSpecializations();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load specializations";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
