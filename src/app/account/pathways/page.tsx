import { redirect } from "next/navigation";

/** Pathways is a section of `/account` now. See `lab/page.tsx`. */
export default function PathwaysRedirect() {
  redirect("/account#pathways");
}
