import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { FlowHeader } from "@/components/FlowHeader";
import { getSessionUser } from "@/lib/session";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Log In",
  description:
    "Log in to Legends of Medicine. No password needed — we email you a one-time link.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
});

/** Signed-in state depends on a cookie, so this page can never be prerendered. */
export const dynamic = "force-dynamic";

function safePath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safePath(searchParams?.next);

  // Already signed in — nothing to do here.
  const user = getSessionUser();
  if (user) redirect(next || "/account");

  return (
    <>
      <FlowHeader showAccount={false} />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
        <div className="rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8">
          <LoginForm next={next || undefined} linkError={searchParams?.error === "link"} />
        </div>
      </main>
    </>
  );
}
