import { NextResponse } from "next/server";

/**
 * POST /api/auth/register — no longer a thing.
 *
 * Accounts are not signed up for on this site. One is created for the doctor
 * when they submit step 1 of the apply form (`POST /api/applications`), which
 * is also what signs them in. Kept as an explicit refusal rather than deleted,
 * because the route used to answer `{ ok: true }` with an invented user — and
 * anything still calling it should fail loudly rather than believe that.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Registration happens through the apply flow.",
      use: "POST /api/applications",
    },
    { status: 410 },
  );
}
