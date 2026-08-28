import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ApplyWizard } from "@/components/ApplyWizard";
import { fetchCourseFromBackend } from "@/lib/courses";
import {
  findApplicantProfile,
  findApplicationForCourse,
  isConfigured,
  isJourneyComplete,
} from "@/lib/applyApi";
import { findAppointmentForApplication, isBookingConfigured } from "@/lib/bookingApi";
import { getSessionUser } from "@/lib/session";
import { buildMetadata } from "@/lib/seo";

/**
 * The application, as a page rather than a popup.
 *
 * It started as a modal, which was fine for one form. The journey is ten steps
 * — details, cases, submit, book a call, confirm, pay — and that does not
 * belong in a 512px box with no URL. A page gives every step an address, so a
 * link can drop somebody straight back into the step they left, refresh works,
 * and the browser's own Back button behaves.
 */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const course = await fetchCourseFromBackend(params.slug);
  return buildMetadata({
    title: course ? `Apply — ${course.name}` : "Apply",
    alternates: { canonical: `/apply/${params.slug}` },
    // An application in progress is nobody else's business.
    robots: { index: false, follow: false },
  });
}

/** Reads the session cookie and live application state. */
export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { step?: string };
}) {
  const course = await fetchCourseFromBackend(params.slug);
  if (!course) notFound();

  const user = getSessionUser();

  // What they have already done for this course — finished ones included, so a
  // Star who has booked cannot be handed a blank form and apply twice.
  const application =
    user && isConfigured()
      ? await findApplicationForCourse(user.email, String(course.id))
      : null;

  const profile =
    user && isConfigured() && !application
      ? await findApplicantProfile(user.email)
      : null;

  // The call already booked for this application, if any. Read on the server so
  // a Star who comes back to step 3 sees what they booked instead of being
  // asked to pick a time all over again.
  const appointment =
    application?.id && isBookingConfigured()
      ? await findAppointmentForApplication(application.id)
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <Link
        href={`/programs/${params.slug}`}
        className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-white/70"
      >
        ← Back to {course.name}
      </Link>

      {isJourneyComplete(application) ? (
        <JourneyFinished courseName={course.name} mentorName={course.mentorName ?? undefined} />
      ) : (
      <ApplyWizard
        courseId={String(course.id)}
        courseSlug={params.slug}
        courseName={course.name}
        mentorName={course.mentorName ?? undefined}
        mentorEmail={course.mentorEmail ?? course.faculty?.email ?? undefined}
        feeInr={process.env.APPLY_EXPLORATORY_FEE_INR || undefined}
        user={
          user
            ? {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              }
            : null
        }
        application={application}
        profile={profile}
        appointment={appointment}
        requestedStep={Number(searchParams?.step) || undefined}
      />
      )}
    </main>
  );
}

/**
 * This one is finished.
 *
 * Shown to anyone arriving at a course they have already been through — the
 * day after paying, or a month later. It reads as the confirmation first
 * because that is what the page is most often opened for; the line about not
 * applying twice is there so a second attempt is not a mystery. Applying again
 * would raise a second lead for the same person and the same course, and put a
 * duplicate in front of the team. Another programme is still open to them, so
 * this points there rather than being a dead end.
 */
function JourneyFinished({
  courseName,
  mentorName,
}: {
  courseName: string;
  mentorName?: string;
}) {
  return (
    <section className="mt-8 rounded-2xl bg-[#0f0f12] p-6 text-center ring-1 ring-white/10 sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
        <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden />
      </div>
      <h1 className="mt-5 font-serif text-2xl text-white">You&rsquo;re all set</h1>
      <p className="mt-3 text-sm text-white/75">
        Your slot for <span className="text-white">{courseName}</span>
        {mentorName ? ` with ${mentorName}` : ""} is booked and your application is with
        the team.
      </p>
      <p className="mt-3 text-xs text-white/45">
        You&rsquo;ve already applied for this programme, so there&rsquo;s nothing more to do
        here.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/account"
          className="inline-flex rounded-md bg-[#ab834d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a6a40]"
        >
          View your application
        </Link>
        <Link
          href="/programs"
          className="inline-flex rounded-md border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
        >
          Browse other programmes
        </Link>
      </div>
    </section>
  );
}
