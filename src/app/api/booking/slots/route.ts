import { NextResponse } from "next/server";
import { fetchSlots, isBookingConfigured } from "@/lib/bookingApi";
import { getSessionUser } from "@/lib/session";

/**
 * The times a Star can pick from.
 *
 * A thin pass-through, but not a pointless one: the platform call carries an
 * API key that must stay on the server, and the answer is only for somebody
 * signed in. The Legend is named by the caller because the course page is
 * where that link is known — a course points at a doctor record, and the
 * doctor's email is the Legend's account.
 */
export async function GET(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!isBookingConfigured()) {
    return NextResponse.json(
      { error: "Booking is not available right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const params = new URL(req.url).searchParams;
  const legendEmail = (params.get("legendEmail") || "").trim();

  if (!legendEmail) {
    // The course has no Legend email on it, which is a setup problem rather
    // than something the applicant can do anything about. Say so plainly
    // instead of showing an empty list that looks like "fully booked".
    return NextResponse.json(
      {
        error:
          "This programme has no Legend calendar set up yet. Our team will be in touch to " +
          "arrange your call.",
      },
      { status: 422 },
    );
  }

  const result = await fetchSlots({
    legendEmail,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    slots: result.data?.slots ?? [],
    timeZone: result.data?.timeZone,
    notice: result.data?.notice,
  });
}
