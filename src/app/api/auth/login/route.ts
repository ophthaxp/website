import { NextResponse } from "next/server";

// POST /api/auth/login — body: { email: string, password: string }
// Stub. Replace with your real auth provider (NextAuth, Clerk, custom).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: { id: "u_demo", email: body.email, name: "Demo Student" },
    token: "stub.jwt.token",
  });
}
