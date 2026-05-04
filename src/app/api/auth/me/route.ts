import { NextResponse } from "next/server";

// GET /api/auth/me — returns the current user from the auth cookie/header.
// Stub returns null so the UI can render the logged-out state by default.
export async function GET() {
  return NextResponse.json({ user: null });
}
