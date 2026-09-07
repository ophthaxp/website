import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, Share2 } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getSessionUser } from "@/lib/session";
import { doctorName } from "@/lib/utils";
import { fetchCoursesFromBackend } from "@/lib/courses";
import { outlookOwnerKey, readOutlookForOwner } from "@/lib/outlookApi";
import { parseOutlook } from "@/lib/outlookSnapshot";
import { waitlistFor } from "@/lib/waitlistApi";
import { PageHeading } from "@/components/dashboard/PageHeading";
import { YourSpace } from "@/components/dashboard/YourSpace";
import { ToolCard } from "@/components/dashboard/ToolCard";
import { PointerGlow } from "@/components/dashboard/PointerGlow";
import { THREAD } from "@/components/dashboard/thread";
import {
  ApplicationList,
  loadApplications,
  type ApplicationRow,
} from "@/components/dashboard/Applications";
import {
  PathwaysPanel,
  type PathwayMatch,
  type PathwayRecord,
} from "@/components/dashboard/PathwaysPanel";

export const metadata: Metadata = buildMetadata({
  title: "Your Space",
  description: "Where your work with Legends of Medicine stands.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
});

/**
 * The whole dashboard, on one page.
 *
 * Your Space, the Growth Lab and Pathways were three routes to begin with. They
 * are three sections now because everything a doctor has here fits on a single
 * scroll, and a page load is a poor price for the question "what else is
 * there". The header's tabs jump between them and light up as you pass — see
 * `DashboardNav`.
 *
 * Both reads happen once, at the top, and feed the Pathways section below.
 */
export default async function AccountPage() {
  const user = getSessionUser();
  const name = doctorName(user?.firstName, user?.lastName);
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // The account's own copy of the last outlook, so it is on the page before the
  // browser has done anything — and so a doctor signing in from a second device
  // sees what they ran on the first. Null here is not "none": the browser may
  // still hold one, which the pane falls back to.
  const ownerKey = user ? outlookOwnerKey(user.email) : null;

  // Independent, so they wait together rather than one after the other. A
  // programme list that fails to load costs the suggestion card, not the page.
  //
  // The waitlist is read here rather than in the button so the two unbuilt
  // tools open in their settled state — a doctor who signed up last week should
  // not watch "Count me in" correct itself after hydration.
  const [rows, programs, storedOutlook, joinedTools] = await Promise.all([
    user ? loadApplications(user.email).catch(() => [] as ApplicationRow[]) : [],
    fetchCoursesFromBackend().catch(() => []),
    ownerKey ? readOutlookForOwner(ownerKey) : Promise.resolve(null),
    user ? waitlistFor(user.email).catch(() => [] as string[]) : ([] as string[]),
  ]);

  const applied = new Set(rows.map((row) => row.courseName.trim().toLowerCase()).filter(Boolean));

  /* The suggestion is the first programme they have not already applied for — a
     card pointing at the thing sitting half-finished below it would be noise.
     Once they have applied for everything, it falls back to the first. */
  const suggestion =
    programs.find((program) => !applied.has(program.name.trim().toLowerCase())) ?? programs[0];

  const match: PathwayMatch | null = suggestion
    ? {
        name: suggestion.name,
        slug: suggestion.slug,
        blurb: suggestion.headline || suggestion.tagline || suggestion.description || "",
        mentor: suggestion.faculty?.name || suggestion.mentorName,
        duration: durationLabel(suggestion.durationMonths, suggestion.durationWeeks),
        // The programme's own highlights, which are already written as short
        // phrases. Three is what fits on one line without wrapping oddly.
        tags: suggestion.highlights?.slice(0, 3),
      }
    : null;

  const latest = rows[0];
  const record: PathwayRecord = {
    total: rows.length,
    submitted: rows.filter((row) => row.submitted).length,
    latestTitle: latest?.headline.title ?? null,
    latestBody: latest?.headline.body ?? null,
  };

  const tools = THREAD.filter((item) => item.key !== "pathways");

  return (
    <>
      <section id="your-space" aria-labelledby="your-space-title" className="dash-section">
        <PageHeading
          level={1}
          id="your-space-title"
          eyebrow="Your space"
          title="Curated for the Legend in you."
          aside={
            <>
              <p className="flex items-center justify-end gap-2 text-sm text-white/60">
                <Lock className="h-3.5 w-3.5 text-white/30" aria-hidden />
                Welcome back, {name}
              </p>
              <p className="mt-1.5 text-sm text-white/35">{today}</p>
            </>
          }
        />

        <YourSpace
          match={match}
          outlook={parseOutlook(storedOutlook)}
          joinedTools={joinedTools}
        />
      </section>

      <section
        id="growth-lab"
        aria-labelledby="growth-lab-title"
        className="dash-section mt-24 lg:mt-32"
      >
        <PageHeading
          id="growth-lab-title"
          eyebrow="Growth lab"
          title="Tools that chase breakthroughs."
        />

        <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-3">
          {tools.map((item) => (
            <ToolCard key={item.key} item={item} joined={joinedTools.includes(item.key)} />
          ))}
        </div>
      </section>

      <section
        id="pathways"
        aria-labelledby="pathways-title"
        className="dash-section mt-24 lg:mt-32"
      >
        <PageHeading id="pathways-title" eyebrow="Pathways" title="Mastery, passed forward." />

        <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* The one way from the dashboard onto the programmes site, and the
              only one the whole signed-in space is meant to have besides the
              logo. It carries an id because everything else that used to say
              "browse programmes" now points here instead of leaving. */}
          <Link
            id="explore-programmes"
            href="/programs"
            /* Same hover as the Growth Lab cards: the light that follows the
               cursor, a step up, a warmed outline. It is the same kind of
               object — a whole card that is one link — so it should answer the
               pointer the same way. */
            className="group relative flex min-h-[380px] flex-col overflow-hidden rounded-[22px] bg-ink-900/70 p-6 ring-1 ring-white/[0.08] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_60px_-24px_rgba(0,0,0,0.95)] hover:ring-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:p-8"
          >
            <PointerGlow />

            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[3.5rem] -right-[1.75rem] h-[19rem] w-[19rem] rounded-full bg-[radial-gradient(circle,rgba(183,90,68,0.07),rgba(183,90,68,0.03)_44%,rgba(183,90,68,0)_72%)] opacity-80 transition duration-500 group-hover:opacity-100"
            />

            <div className="relative flex items-start justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 transition duration-300 group-hover:text-white/65">
                Your path to mastery
              </p>
              <Share2
                className="h-[18px] w-[18px] shrink-0 text-white/35 transition duration-300 group-hover:text-accent"
                strokeWidth={1.6}
                aria-hidden
              />
            </div>

            <div className="relative mt-auto pt-16">
              <h3 className="font-serif text-[clamp(2.4rem,5vw,4rem)] leading-[1.02] text-white">
                Explore Programmes
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
                Find the programme that belongs in your next chapter.
              </p>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Explore pathways
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </Link>

          <PathwaysPanel match={match} record={record} />
        </div>

        <div id="applications" className="dash-section mt-16 lg:mt-20">
          <h3 className="font-serif text-2xl text-white sm:text-3xl">Your applications</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
            Everything you have started or submitted, where it has got to, and what you have been
            charged.
          </p>
          <div className="mt-8">
            <ApplicationList rows={rows} />
          </div>

          <p className="mt-10 text-xs leading-relaxed text-white/40">
            Something look wrong? Reply to any email from us and a real person will pick it up.
          </p>
        </div>
      </section>
    </>
  );
}

function durationLabel(months?: number, weeks?: number): string | undefined {
  if (months && months > 0) return `${months} ${months === 1 ? "month" : "months"}`;
  if (weeks && weeks > 0) return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  return undefined;
}
