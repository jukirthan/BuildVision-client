import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

const VALUES = [
  {
    title: "Engineering first",
    copy: "Every layout suggestion and cost estimate is grounded in structural calculations, not guesswork.",
  },
  {
    title: "Built for the field",
    copy: "Tools work as well on a site tablet as they do at a studio desk.",
  },
  {
    title: "Open by default",
    copy: "Export your work as JSON, CSV, or PDF at any time — your data isn't locked in.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-20 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="section-eyebrow">About BuildVision</p>
            <h1 className="mt-3 text-display-xl text-text-primary">
              A focused toolset for structural design.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-text-secondary">
              BuildVision started as an internal tool for a small team of
              architects and civil engineers who were tired of switching
              between CAD software, spreadsheets, and separate estimating
              tools. Today it brings 3D structural planning, AI layout
              suggestions, material costing, and on-site camera measurement
              into a single browser-based workspace.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.05}>
                <div className="card h-full p-5">
                  <h3 className="font-display text-base font-semibold text-text-primary">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {v.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
