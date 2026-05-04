import { NextResponse } from "next/server";
import { PROGRAMS } from "@/lib/data";
import type { Specialty } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/programs?specialty=retina
export async function GET(req: Request) {
  const url = new URL(req.url);
  const specialty = url.searchParams.get("specialty") as Specialty | null;
  const data = specialty ? PROGRAMS.filter((p) => p.specialty === specialty) : PROGRAMS;
  return NextResponse.json({ data, count: data.length });
}
