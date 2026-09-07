import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { FlowHeader } from "@/components/FlowHeader";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Forgot Password",
  description: "Ask for a link to set a new Legends of Medicine password.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
});

/**
 * Unlike `/login` and `/signup` this does not send a signed-in reader away.
 * Wanting a new password is not something being signed in settles.
 */
export default function ForgotPasswordPage() {
  return (
    <>
      <FlowHeader showAccount={false} />
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-20">
        <div className="rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] sm:p-8">
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
