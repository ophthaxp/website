import Image from "next/image";
import Link from "next/link";

/**
 * Where the doctor lands if they abandon the payment.
 *
 * The original payment link stays valid until it is paid or expires, so the
 * message is "you can still pay", not "start again" — sending them back to a
 * form would create a second lead for the same person.
 */

export const metadata = {
  title: "Payment not completed — Legends of Medicine",
  robots: { index: false, follow: false },
};

export default function PaymentCancelled() {
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
      <p className="text-xs uppercase tracking-widest text-white/40">Payment not completed</p>
      <h1 className="mt-2 font-serif text-4xl text-white">No payment was taken</h1>
      <p className="mt-3 text-white/60">
        Your application is safe and your place in the queue is unaffected. The payment link in your
        welcome email still works whenever you are ready.
      </p>

      <p className="mt-6 text-sm text-white/40">
        Trouble paying? Write to{" "}
        <a href="mailto:admissions@legendsofmedicine.com" className="text-white/70 underline">
          admissions@legendsofmedicine.com
        </a>{" "}
        and we will help.
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
