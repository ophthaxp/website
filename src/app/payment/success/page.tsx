import Image from "next/image";
import Link from "next/link";

/**
 * A payment landing somewhere other than the application.
 *
 * The booking fee is paid inside the apply flow now, and the provider returns
 * there — `/apply/[slug]?payment=return` — so nothing in the current journey
 * comes here. What still can: a payment link raised by hand in the admin
 * console, and the old welcome-email links that are still sitting in inboxes.
 * Those people have parted with money and must not meet a 404, so the page
 * stays.
 *
 * It deliberately does not decide whether the payment succeeded. The browser
 * arriving proves nothing — anyone can open this URL. Payment is confirmed
 * server to server by the provider's webhook, which is also what moves the
 * application on. So this says "received", shows the reference for support,
 * and stops there.
 */

export const metadata = {
  title: "Payment received — Legends of Medicine",
  robots: { index: false, follow: false },
};

export default function PaymentSuccess({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const paymentId = searchParams?.razorpay_payment_id;
  const reference = Array.isArray(paymentId) ? paymentId[0] : paymentId;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <Image
        src="/logo.png"
        alt="Legends of Medicine"
        width={410}
        height={120}
        priority
        className="mb-6 h-[64px] w-auto"
      />
      <h1 className="mt-2 font-display text-[clamp(2rem,4.4vw,3rem)] uppercase leading-[1.02] tracking-[-0.01em] text-white">
        Payment <span className="text-accent">received</span>
      </h1>
      <p className="mt-3 text-sm text-white/70">
        Thank you. Your payment is with us and your application page will show it once it has
        gone through — usually within a minute.
      </p>

      {reference ? (
        <p className="mt-6 text-sm text-white/40">
          Payment reference: <span className="text-white/70">{reference}</span>
        </p>
      ) : null}

      <p className="mt-6 text-sm text-white/40">
        Nothing showing within an hour? Write to{" "}
        <a href="mailto:admissions@legendsofmedicine.com" className="text-white/70 underline">
          admissions@legendsofmedicine.com
        </a>{" "}
        and quote the reference above.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/account"
          className="inline-flex rounded-[10px] bg-accent px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-deep"
        >
          View your application
        </Link>
        <Link
          href="/"
          className="inline-flex rounded-[10px] bg-ink-800 px-6 py-3 text-[15px] font-medium text-white/85 transition hover:bg-ink-700 hover:text-white"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
