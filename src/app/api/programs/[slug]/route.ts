import { NextResponse } from "next/server";
import { fetchCourseFromBackend } from "@/lib/courses";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const program = await fetchCourseFromBackend(params.slug);
  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: program });
}
