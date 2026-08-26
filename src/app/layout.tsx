import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Anton } from "next/font/google";
import "./globals.css";
import { buildMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/* UI + body: the geometric-humanist grotesque the Figma sets everything in. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

/* Program titles and the trailer card — high-contrast serif.
   Weights are pinned rather than left to the variable axis: the full
   `ital,wght@0,400..900;1,400..900` request fails to resolve here and
   next/font degrades to fallback-only faces without raising, which shows up
   as every `font-serif` element silently rendering in the sans. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-playfair",
  display: "swap",
});

/* Display: the heavy condensed face used for "Become Legendary" and the
   Access / Knowledge / Breakthrough words. Single weight by design. */
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable} ${anton.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
