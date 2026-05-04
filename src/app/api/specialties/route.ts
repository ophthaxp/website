import { NextResponse } from "next/server";
import { SPECIALTY_TABS } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: SPECIALTY_TABS });
}
