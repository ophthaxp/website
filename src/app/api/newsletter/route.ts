import { NextResponse } from "next/server";

// POST /api/newsletter — body: { email: string }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 422 });
  }
  return NextResponse.json({ ok: true, email });
}
