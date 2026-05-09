import { NextResponse } from "next/server";
import { fetchDoctorsFromBackend } from "@/lib/courses";
import type { Specialty } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/doctors?specialty=cataract&q=mehta
export async function GET(req: Request) {
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty") as Specialty | null;
  const q = url.searchParams.get("q")?.toLowerCase().trim() ?? "";

  let result = await fetchDoctorsFromBackend();
  if (specialty) result = result.filter((d) => d.specialty.includes(specialty));
  if (q) {
    result = result.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ data: result, count: result.length });
}
