import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { doctorName } from "@/lib/utils";
import { isWaitlistTool, joinWaitlist } from "@/lib/waitlistApi";

/**
 * "Count me in" — the one door between the dashboard's waitlist buttons and the
 * list itself.
 *
 * The browser sends a tool name and nothing else. **The address comes from the
 * session**, never from the request body: an endpoint that accepted an address
 * would let anybody sign anybody else up, and the confirmation the doctor sees
 * would be a lie about somebody else's inbox.
 *
 * Signed-in only, which costs nothing here — the buttons live on `/account`,
 * which is behind the same session.
 */
export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const tool = (body as { tool?: unknown })?.tool;
  if (!isWaitlistTool(tool)) {
    return NextResponse.json({ success: false, error: "Unknown tool" }, { status: 400 });
  }

  const joined = await joinWaitlist({
    tool,
    email: user.email,
    name: doctorName(user.firstName, user.lastName),
  });

  // Reported rather than swallowed. Everywhere else a failed write here would
  // cost a convenience; this one has just told a doctor they are on a list, so
  // the button needs to know it did not take and say so.
  if (!joined) {
    return NextResponse.json(
      { success: false, error: "Could not save that just now" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: { tool, joined: true } });
}
