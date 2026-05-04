import { NextResponse } from "next/server";

// POST /api/auth/register — body: { fullName, email, password, qualification }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { fullName?: string; email?: string; password?: string; qualification?: string }
    | null;

  if (!body?.fullName || !body?.email || !body?.password) {
    return NextResponse.json(
      { error: "fullName, email and password are required" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: `u_${Date.now()}`,
      fullName: body.fullName,
      email: body.email,
      qualification: body.qualification ?? "MBBS",
    },
  });
}
