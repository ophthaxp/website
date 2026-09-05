import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { doctorName } from "@/lib/utils";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Reads a cookie and live data, so nothing under here can be prerendered. */
export const dynamic = "force-dynamic";

/**
 * The signed-in shell.
 *
 * The session check sits here rather than on each page so that adding a fourth
 * tab cannot accidentally ship one that is readable logged out. `next` carries
 * the tab they were aiming at, so logging in returns them to it rather than
 * dropping everybody on Your Space.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  if (!user) redirect("/login?next=%2Faccount");

  return (
    <div className="dash-shell relative min-h-screen bg-black">
      {/* One warm bloom behind the top of the page. The dashboard is otherwise
          flat black, and without it the header and the first panel read as two
          unrelated rectangles rather than one lit room. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-14rem] top-[-18rem] h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.16),rgba(183,90,68,0)_62%)]"
      />

      <DashboardNav name={doctorName(user.firstName, user.lastName)} email={user.email} />
      <main className="relative mx-auto w-full max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        {children}
      </main>
    </div>
  );
}
