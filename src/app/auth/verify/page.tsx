import type { Metadata } from "next";
import Link from "next/link";
import { verifyUser } from "@/lib/platformAuth";
import { FlowHeader } from "@/components/FlowHeader";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Verify Your Email",
  alternates: { canonical: "/auth/verify" },
  robots: { index: false, follow: false },
});

/** Redeems a one-time token, so it can never be cached or prerendered. */
export const dynamic = "force-dynamic";

/**
 * Where the platform's verification email lands.
 *
 * The token is redeemed through the platform's own `/auth/verify-user`, which
 * flips the account to ACTIVE. Until that happens `signin` refuses them, so
 * this page is the gate between signing up and being able to log back in.
 *
 * The platform's email currently points at whatever `SIGN_UP_TOKEN_LINK` is set
 * to — point it here for website applicants.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token ?? "";
  const result = token
    ? await verifyUser(token)
    : { ok: false, error: "This link is missing its token." };

  return (
    <>
      <FlowHeader showAccount={false} />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
        <div className="rounded-[22px] bg-ink-900/70 p-6 text-center ring-1 ring-white/[0.08] sm:p-8">
        {result.ok ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <svg
                className="h-7 w-7 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="mt-5 text-[22px] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">Email verified</h1>
            <p className="mt-3 text-sm text-white/75">
              Your account is active. Log in and you&rsquo;ll pick up your application where
              you left it.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-extrabold leading-[1.25] tracking-[-0.015em] text-white">That link didn&rsquo;t work</h1>
            <p className="mt-3 text-sm text-white/75">{result.error}</p>
            <p className="mt-3 text-xs text-white/45">
              Verification links expire. If yours has, applying again with the same email
              will send a fresh one.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-[10px] bg-ink-800 px-6 py-3 text-[15px] font-medium text-white/85 transition hover:bg-ink-700 hover:text-white"
            >
              Go to log in
            </Link>
          </>
        )}
        </div>
      </main>
    </>
  );
}
