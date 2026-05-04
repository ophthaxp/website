import { NextResponse } from "next/server";
import { PROGRAMS } from "@/lib/data";

// POST /api/enrollments
// Body: { programSlug: string, userId?: string, lead?: LeadPayload }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.programSlug !== "string") {
    return NextResponse.json({ error: "programSlug is required" }, { status: 422 });
  }

  const program = PROGRAMS.find((p) => p.slug === body.programSlug);
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: `enr_${Date.now()}`,
    program: { slug: program.slug, name: program.name, startDate: program.startDate },
    status: "pending_payment",
  });
}
