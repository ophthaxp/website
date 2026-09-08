import { NextResponse } from "next/server";
import { callLoma, lomaFailure, lomaPath } from "@/lib/lomaProxy";

/**
 * /api/loma/* — everything Caseroom asks the platform for.
 *
 * One catch-all rather than a handler per endpoint. LoMa has around thirty
 * routes and this layer makes no decisions about any of them: it checks the
 * session, attaches the doctor's platform token and passes the answer back
 * untouched. Thirty files that each did that would be thirty chances for one to
 * drift.
 *
 * Answers are relayed verbatim — LoMa returns the raw payload and `{ detail }`
 * on error, not the platform's usual envelope — so the client reads exactly
 * what the standalone app read.
 */

export const dynamic = "force-dynamic";

/** LoMa is per-doctor and partly model-generated; none of it may be cached. */
const NO_STORE = { "cache-control": "private, no-store" };

function reply(result: Awaited<ReturnType<typeof callLoma>>) {
  if ("failure" in result) {
    const { status, body } = lomaFailure(result.failure);
    return NextResponse.json(body, { status, headers: NO_STORE });
  }
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

function badPath() {
  return NextResponse.json({ detail: "Unknown Caseroom request." }, { status: 400, headers: NO_STORE });
}

export async function GET(req: Request, { params }: { params: { path?: string[] } }) {
  const path = lomaPath(params.path);
  if (!path) return badPath();

  return reply(await callLoma({ method: "GET", path, search: new URL(req.url).search }));
}

export async function POST(req: Request, { params }: { params: { path?: string[] } }) {
  const path = lomaPath(params.path);
  if (!path) return badPath();

  // A body is optional throughout LoMa — several POSTs take none at all
  // (`/case/start`, `/coach`) — so an unparseable one becomes `{}` rather than
  // an error, which is what the standalone client sent for those.
  const body = await req.json().catch(() => ({}));

  return reply(await callLoma({ method: "POST", path, search: new URL(req.url).search, body }));
}
