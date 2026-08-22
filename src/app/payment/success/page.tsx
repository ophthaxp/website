import Image from "next/image";
import Link from "next/link";

/**
 * Where Razorpay returns the doctor after the exploratory-call payment.
 *
 * This page deliberately does not decide whether the payment succeeded. The
 * browser coming back proves nothing — a doctor can close the tab, or land
 * here on a link someone forwarded. The payment is confirmed by the webhook,
 * server to server, which is also what moves the funnel forward. So this says
 * "received", shows the reference for support, and stops there.
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
      <h1 className="mt-2 font-serif text-4xl text-white">Thank you — payment received</h1>
      <p className="mt-3 text-white/60">
        Your exploratory call is booked. Our admissions team will email you shortly to confirm the
        time with your mentor.
      </p>

      {reference ? (
        <p className="mt-6 text-sm text-white/40">
          Payment reference: <span className="text-white/70">{reference}</span>
        </p>
      ) : null}

      <p className="mt-6 text-sm text-white/40">
        Nothing arrived within an hour? Write to{" "}
        <a href="mailto:admissions@legendsofmedicine.com" className="text-white/70 underline">
          admissions@legendsofmedicine.com
        </a>{" "}
        and quote the reference above.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950"
      >
        Back home
      </Link>
    </main>
  );
}
