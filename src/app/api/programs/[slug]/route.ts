import { NextResponse } from "next/server";
import { PROGRAMS } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const program = PROGRAMS.find((p) => p.slug === params.slug);
  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: program });
}
