import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

const POSTS = [
  {
    title: "Why we built camera-based measurement",
    tag: "Product",
    excerpt:
      "A look at how computer-vision-assisted measurement fits into a structural design workflow, and where manual verification still matters.",
  },
  {
    title: "AI layout suggestions, explained",
    tag: "Engineering",
    excerpt:
      "How BuildVision generates column and beam grid options and scores them against load paths and spacing constraints.",
  },
  {
    title: "From sketch to BOQ in one session",
    tag: "Workflow",
    excerpt:
      "A walkthrough of designing a 3-storey commercial building and exporting a cost estimate in under 30 minutes.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-24 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="section-eyebrow">Blog</p>
            <h1 className="mt-3 text-display-xl text-text-primary">
              Notes on structural design & product.
            </h1>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05}>
                <article className="card card-hover flex h-full flex-col p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {p.tag}
                  </span>
                  <h2 className="mt-3 font-display text-base font-semibold text-text-primary">
                    {p.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                    {p.excerpt}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
