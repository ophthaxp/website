import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-950/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-4 sm:px-8">
        <div className="sm:col-span-2">
          <p className="text-base font-semibold text-white">OphthaXP</p>
          <p className="mt-3 max-w-sm text-sm text-white/55">
            Live, cohort-based mentorship for practising ophthalmologists and
            final-year MBBS students preparing to specialise.
          </p>
        </div>

        <nav aria-label="Programs" className="text-sm">
          <p className="mb-3 font-semibold text-white">Programs</p>
          <ul className="space-y-2 text-white/60">
            <li>
              <Link href="/programs/cataract-mastery-cohort">Cataract Mastery</Link>
            </li>
            <li>
              <Link href="/programs/vitreo-retinal-track">Vitreo-Retinal</Link>
            </li>
            <li>
              <Link href="/programs/cornea-refractive-fellowship-prep">
                Cornea & Refractive
              </Link>
            </li>
            <li>
              <Link href="/programs/glaucoma-clinic">Glaucoma Clinic</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company" className="text-sm">
          <p className="mb-3 font-semibold text-white">Company</p>
          <ul className="space-y-2 text-white/60">
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/doctors">Mentors</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/5">
        <p className="mx-auto max-w-7xl px-5 py-5 text-center text-xs text-white/40 sm:px-8">
          © {new Date().getFullYear()} OphthaXP. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
