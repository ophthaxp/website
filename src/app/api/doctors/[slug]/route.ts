import { NextResponse } from "next/server";
import { DOCTORS } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const doc = DOCTORS.find((d) => d.slug === params.slug);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: doc });
}
