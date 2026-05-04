import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <p className="text-xs uppercase tracking-widest text-white/40">404</p>
      <h1 className="mt-2 font-serif text-4xl text-white">Page not found</h1>
      <p className="mt-3 text-white/60">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink-950"
      >
        Back home
      </Link>
    </main>
  );
}
