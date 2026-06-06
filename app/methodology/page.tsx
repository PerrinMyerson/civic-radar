const sources = [
  {
    href: "https://onlinelibrary.wiley.com/doi/10.1002/sres.3850090105",
    label: "Ronald Coase, The Problem of Social Cost",
  },
  {
    href: "https://blog.cosmos-institute.org/p/coasean-bargaining-at-scale",
    label: "Cosmos Institute, Coasean Bargaining at Scale",
  },
  {
    href: "https://sites.tufts.edu/civicstudies/2022/01/26/design-principles-for-commons/",
    label: "Ostrom commons-governance design principles",
  },
  {
    href: "https://geo.pol.is/",
    label: "Pol.is",
  },
  {
    href: "https://kclpure.kcl.ac.uk/portal/en/publications/sorting-a-public-using-quali-quantitative-methods-to-interrogate-",
    label: "vTaiwan and quali-quantitative public sorting",
  },
  {
    href: "https://www.aeaweb.org/articles?id=10.1257%2Fpandp.20181002",
    label: "Quadratic voting and preference intensity",
  },
  {
    href: "https://deepmind.google/research/publications/65220/",
    label: "Habermas Machine: AI and common ground in deliberation",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f4] px-4 py-8 text-zinc-950 md:px-8">
      <article className="mx-auto max-w-4xl">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
          Civic Radar methodology
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Resident-first civic aid, not automated political bargaining
        </h1>

        <section className="mt-6 grid gap-4 text-sm leading-7 text-zinc-700">
          <p>
            Civic Radar is designed to reduce civic transaction costs: finding public
            actions, understanding why they may matter, and deciding whether to learn
            more or respond. It is not currently a true Coasean bargaining system.
          </p>
          <p>
            A true Coasean system would need identifiable affected parties,
            bargaining rights, tradeoff packages, commitments, enforcement, and a
            legitimacy model. Civic Radar is closer to public-utility infrastructure:
            alerts, evidence-bound briefs, preference-intensity feedback, and
            privacy-thresholded public signals.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {[
            [
              "Relevance",
              "Items are ranked by region match, topic match, actionability, recency, source confidence, and user-stated priorities.",
            ],
            [
              "Evidence",
              "Briefs must point back to official source links. Missing source evidence lowers confidence instead of producing a stronger claim.",
            ],
            [
              "Burden",
              "Resident-effort scores estimate source, decision, actor, timing, and action-path friction without claiming objective policy importance.",
            ],
            [
              "Feedback",
              "Resident feedback separates position, intensity, affectedness, reason, and desired outcome.",
            ],
            [
              "Privacy",
              "Public aggregates are thresholded and never expose private life context, email, or individual reasons.",
            ],
          ].map(([title, body]) => (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={title}>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Research basis</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
            {sources.map((source) => (
              <li key={source.href}>
                <a className="font-medium text-teal-700 hover:text-teal-900" href={source.href}>
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Current limitations</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
            <li>Civic Radar does not negotiate policy bargains for users.</li>
            <li>It does not submit comments, emails, calls, or testimony without explicit user action.</li>
            <li>It does not prove democratic representativeness from a small sample.</li>
            <li>It should not be used as the only source for legal, financial, or voting decisions.</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
