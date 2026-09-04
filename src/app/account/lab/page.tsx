import { redirect } from "next/navigation";

/**
 * The Growth Lab was its own route until it became a section of `/account`.
 * Kept as a redirect so a link or an open tab from before the change still
 * lands in the right place rather than on a 404.
 */
export default function GrowthLabRedirect() {
  redirect("/account#growth-lab");
}
