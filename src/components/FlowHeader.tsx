import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { doctorName } from "@/lib/utils";
import { AccountChip } from "./AccountChip";

/**
 * The header over the application and booking flow.
 *
 * Deliberately **not** the marketing `Navbar`. Every link in that header —
 * Legends, Programs, Future, Ask LoMa — is an invitation to leave, and this is
 * a page where somebody is halfway through entering their details, choosing a
 * time with a Legend, and paying. A checkout does not offer you the shop.
 *
 * What it does carry is the two things that were missing and that a page asking
 * for money has no business being without: the mark, so it plainly belongs to
 * Legends of Medicine, and who you are signed in as, so it is obvious the
 * details being filled in are going to the right account.
 *
 * Same chrome as the dashboard's header — sticky, hairline rule, blurred black
 * — so the flow and the place it delivers you to feel like one product.
 *
 * `showAccount={false}` leaves the mark alone, for the log-in and sign-up
 * screens: nobody is signed in on either (both redirect away if they are), so
 * the right-hand side would be a "Log in" button beside a log-in form.
 */
export function FlowHeader({ showAccount = true }: { showAccount?: boolean }) {
  const user = getSessionUser();
  const name = user ? doctorName(user.firstName, user.lastName) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-black/85 backdrop-blur-md">
      {/* With nothing on the right, `justify-between` is just a left margin: the
          mark sits hard against the edge of a page whose whole content — one
          narrow card — is centred under it. On those pages it goes to the
          middle, over the card it belongs to. */}
      <div
        className={`mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3 sm:px-8 lg:px-12 ${
          showAccount ? "justify-between" : "justify-center"
        }`}
      >
        <Link href="/" aria-label="Legends of Medicine — home" className="shrink-0">
          <Image
            src="/brand/lom-logo-full.png"
            alt="Legends of Medicine"
            width={623}
            height={290}
            priority
            /* Larger where it stands alone. Beside an account chip the mark is
               one of two things sharing a bar and is sized not to shout over
               it; centred over a single card it is the only thing on the page
               above the form, and at the smaller size it read as an afterthought
               rather than as the page's own mark. */
            className={
              showAccount ? "h-11 w-auto sm:h-14" : "h-14 w-auto sm:h-[68px]"
            }
          />
        </Link>

        {!showAccount ? null : user && name ? (
          <AccountChip
            name={name}
            email={user.email}
            links={[
              { href: "/account", label: "Your space" },
              { href: "/account#applications", label: "Your applications" },
            ]}
          />
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
