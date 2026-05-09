import { NextResponse } from "next/server";
import { fetchCoursesFromBackend } from "@/lib/courses";
import type { Specialty } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/programs?specialty=retina
export async function GET(req: Request) {
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty") as Specialty | null;
  const all = await fetchCoursesFromBackend();
  const data = specialty ? all.filter((p) => p.specialty === specialty) : all;
  return NextResponse.json({ data, count: data.length });
}
