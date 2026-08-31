import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { getSessionUser } from "@/lib/session";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Create Account",
  description:
    "Create your Legends of Medicine account. You can browse programmes and apply at any time afterwards.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
});

/** Signed-in state comes from a cookie, so this can never be prerendered. */
export const dynamic = "force-dynamic";

export default function SignupPage() {
  // Already signed in — there is nothing to create.
  if (getSessionUser()) redirect("/account");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
      <div className="rounded-xl bg-ink-850 p-6 ring-1 ring-white/15 sm:p-8">
        <SignupForm />
      </div>
    </main>
  );
}
