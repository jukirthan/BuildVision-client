import { CheckCircle2 } from "lucide-react";
import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Button from "@/components/ui/Button";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    copy: "For individuals exploring the planner and demo tools.",
    features: [
      "1 active project",
      "3D structural planner",
      "Material & cost estimator",
      "Community support",
    ],
  },
  {
    name: "Studio",
    price: "$29",
    period: "/ month",
    copy: "For small architecture and engineering teams.",
    features: [
      "Unlimited projects",
      "Camera measurement",
      "AI layout suggestions",
      "Team workspace",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    copy: "For firms that need SSO, audit logs, and dedicated support.",
    features: [
      "Everything in Studio",
      "SSO & audit logs",
      "Dedicated CSM",
      "Custom integrations",
    ],
  },
];

const FAQS = [
  {
    q: "Do I need to install anything?",
    a: "No — BuildVision runs entirely in the browser, including the 3D planner and camera measurement tools.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Every project can be exported as JSON, CSV, PDF, or a floor plan image at any time.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes — the Starter plan is free and includes one active project with the full planner and estimator.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-10 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="section-eyebrow">Pricing</p>
            <h1 className="mt-3 text-display-xl text-text-primary">
              Simple pricing that scales with your team.
            </h1>
          </Reveal>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.05}>
                <div
                  className={`card h-full p-6 ${
                    plan.featured ? "border-accent ring-1 ring-accent/20" : ""
                  }`}
                >
                  <p className="font-display text-base font-semibold text-text-primary">
                    {plan.name}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-text-primary">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-text-tertiary">{plan.period}</span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{plan.copy}</p>
                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle2 size={15} className="shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    href="/signup"
                    variant={plan.featured ? "primary" : "secondary"}
                    className="mt-6 w-full"
                  >
                    Get started
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-content px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="section-eyebrow">FAQ</p>
            <h2 className="mt-3 text-display-lg text-text-primary">
              Common questions
            </h2>
          </Reveal>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border">
            {FAQS.map((f) => (
              <div key={f.q} className="p-5">
                <p className="font-medium text-text-primary">{f.q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
