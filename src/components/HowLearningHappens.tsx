import { FEATURE_CARDS } from "@/lib/data";

export function HowLearningHappens() {
  const [first, second] = [FEATURE_CARDS.slice(0, 2), FEATURE_CARDS.slice(2)];

  return (
    <section
      aria-labelledby="how-title"
      className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <h2
        id="how-title"
        className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight text-white sm:text-5xl"
      >
        Built Around How Real <br className="hidden sm:block" />
        Learning Happens
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {first.map((c) => (
          <Card key={c.title} title={c.title} body={c.body} tall />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-3 sm:gap-5">
        {second.map((c) => (
          <Card key={c.title} title={c.title} body={c.body} />
        ))}
      </div>
    </section>
  );
}

function Card({ title, body, tall }: { title: string; body: string; tall?: boolean }) {
  return (
    <article
      className={`card relative overflow-hidden p-5 sm:p-6 ${
        tall ? "min-h-[160px] sm:min-h-[200px]" : "min-h-[160px] sm:min-h-[180px]"
      }`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <h3 className="text-sm font-semibold text-white">
        <span className="text-white">{title}</span>
        <span className="ml-1 text-white/40"> — {body}</span>
      </h3>
    </article>
  );
}
