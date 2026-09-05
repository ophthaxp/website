import Image from "next/image";
import Link from "next/link";

/**
 * Where an abandoned payment lands, when it did not start in the apply flow.
 *
 * The flow's own checkout returns to `/apply/[slug]?payment=cancelled`, which
 * can say something useful — it knows whose application it is and that their
 * slot is still held. This page cannot, because it is reached from links that
 * carry no application with them: one raised by hand in the console, or an old
 * welcome email. So it says the one thing that is true of all of them, and
 * points back at the account.
 */

export const metadata = {
  title: "Payment not completed — Legends of Medicine",
  robots: { index: false, follow: false },
};

export default function PaymentCancelled() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <Image
        src="/brand/lom-logo-full.png"
        alt="Legends of Medicine"
        width={623}
        height={290}
        priority
        className="mb-6 h-[92px] w-auto"
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
        Payment not completed
      </p>
      <h1 className="mt-2 font-display text-[clamp(2rem,4.4vw,3rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
        No payment was <span className="text-accent">taken</span>
      </h1>
      <p className="mt-3 text-sm text-white/70">
        Nothing has changed and nothing is lost. Your application is exactly where you left it,
        and you can pick the fee up again from there whenever you&rsquo;re ready.
      </p>

      <p className="mt-6 text-sm text-white/40">
        Trouble paying? Write to{" "}
        <a href="mailto:admissions@legendsofmedicine.com" className="text-white/70 underline">
          admissions@legendsofmedicine.com
        </a>{" "}
        and we will help.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/account#applications"
          className="inline-flex rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
        >
          Back to your application
        </Link>
        <Link
          href="/"
          className="inline-flex rounded-full border border-white/15 px-6 py-3 text-[15px] font-medium text-white/80 transition hover:border-white/25 hover:text-white"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
