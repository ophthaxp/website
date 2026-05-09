import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://ophthaxp.com";

export const SITE_NAME = "OphthaXP";

export const SITE_DESCRIPTION =
  "OphthaXP — live, cohort-based mentorship for practicing ophthalmologists and final-year MBBS students. Learn from senior consultants who have defined the field. Selective cohorts. Real cases. Real outcomes.";

export const DEFAULT_KEYWORDS = [
  "ophthalmology mentorship",
  "ophthalmology fellowship",
  "MBBS to ophthalmology",
  "cataract surgery training",
  "vitreo-retinal surgery course",
  "cornea fellowship India",
  "glaucoma case-based learning",
  "neuro-ophthalmology course",
  "pediatric ophthalmology training",
  "ophthalmology continuing medical education",
  "OphthaXP",
];

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — Be the Best. Learn from the Legends.`,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "education",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Be the Best. Learn from the Legends.`,
      description: SITE_DESCRIPTION,
      locale: "en_IN",
      images: [
        {
          url: "/og.jpg",
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — cohort-based ophthalmology mentorship`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Be the Best. Learn from the Legends.`,
      description: SITE_DESCRIPTION,
      images: ["/og.jpg"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
    ...overrides,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://www.linkedin.com/company/ophthaxp",
      "https://www.instagram.com/ophthaxp",
      "https://twitter.com/ophthaxp",
    ],
    description: SITE_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: SITE_NAME,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function courseListJsonLd(
  courses: { name: string; slug: string; description: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.name,
        description: c.description,
        provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
        url: `${SITE_URL}/programs/${c.slug}`,
      },
    })),
  };
}
