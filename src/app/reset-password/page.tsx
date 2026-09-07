import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { FlowHeader } from "@/components/FlowHeader";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reset Password",
  description: "Set a new password for your Legends of Medicine account.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
});

/** The link carries the token in its query string, so nothing here is static. */
export const dynamic = "force-dynamic";

/**
 * Where the platform's reset email lands.
 *
 * It builds that link from its own `PASSWORD_RESET_LINK` setting and appends
 * `<token>&email=…&appId=…`, so for the mail to arrive here that setting has to
 * end `https://<this site>/reset-password?token=`. The appId is the platform's
 * own bookkeeping and is ignored: this site serves one app and knows which.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const token = (searchParams?.token ?? "").trim();
  const email = (searchParams?.email ?? "").trim();

  return (
    <>
      <FlowHeader showAccount={false} />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
        <div className="rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8">
          {token && email ? (
            <ResetPasswordForm token={token} email={email} />
          ) : (
            /* Half a link is not worth a form. This happens when a mail client
               has wrapped the URL across two lines and only the first was
               followed — common enough to deserve an answer that says what to
               do rather than an empty box that cannot work. */
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                Account
              </p>
              <h1 className="mt-2 font-display text-[clamp(1.875rem,4vw,2.5rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
                Link incomplete
              </h1>
              <p className="mt-3 text-sm text-white/70">
                This reset link is missing part of itself — some mail apps break long
                links across lines. Copy the whole thing from the email, or ask for a
                fresh one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Email me a new link
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
