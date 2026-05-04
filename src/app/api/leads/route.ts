import { NextResponse } from "next/server";
import type { LeadPayload } from "@/types";

// POST /api/leads — captures "Get Started" form submissions.
// Stub: forwards to LEADS_WEBHOOK_URL if configured, otherwise echoes.
export async function POST(req: Request) {
  let payload: LeadPayload;
  try {
    payload = (await req.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload?.fullName || !payload?.email || !payload?.qualification) {
    return NextResponse.json(
      { error: "fullName, email and qualification are required" },
      { status: 422 },
    );
  }

  const webhook = process.env.LEADS_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, receivedAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("[leads] webhook forward failed", err);
    }
  }

  return NextResponse.json({
    ok: true,
    id: `lead_${Date.now()}`,
    received: payload,
  });
}
