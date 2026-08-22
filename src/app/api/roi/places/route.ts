import { NextResponse } from "next/server";
import { fetchPlaces } from "@/lib/roiApi";

/** Minimum characters before the backend is worth asking. Mirrors the backend. */
const MIN_QUERY_LENGTH = 2;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(25, Math.trunc(limitRaw)) : 8;

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ success: true, data: [] });
  }
  try {
    const data = await fetchPlaces(q, limit);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Place search failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
