import { NextResponse } from "next/server";
import { fetchDoctorsFromBackend } from "@/lib/courses";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const doctors = await fetchDoctorsFromBackend();
  const doc = doctors.find((d) => d.slug === params.slug);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: doc });
}
