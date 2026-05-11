import type { NextRequest } from "next/server";

const NOCODE_BASE = (process.env.NOCODE_API_BASE_URL || "").replace(/\/$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!NOCODE_BASE) {
    return new Response(
      "media proxy: NOCODE_API_BASE_URL is not set on this deployment",
      { status: 500 },
    );
  }

  const { path } = await ctx.params;
  if (!path?.length) return new Response("missing file path", { status: 400 });

  const target = `${NOCODE_BASE}/api/public/files/${path
    .map(encodeURIComponent)
    .join("/")}`;

  const range = req.headers.get("range");
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: range ? { range } : undefined,
      cache: "no-store",
      redirect: "follow",
    });
  } catch (err) {
    return new Response(
      `media proxy: upstream fetch failed for ${target} — ${(err as Error).message}`,
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      `media proxy: upstream ${upstream.status} for ${target}`,
      { status: upstream.status || 502 },
    );
  }

  const headers = new Headers();
  for (const h of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "last-modified",
    "etag",
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: upstream.status, headers });
}
