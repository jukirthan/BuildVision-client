import dynamic from "next/dynamic";
import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SmoothScroll from "@/components/site/SmoothScroll";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";

/** Below-the-fold sections load after first paint so the hero stays snappy. */
const AIShowcase = dynamic(() => import("@/components/landing/AIShowcase"));
const PlannerMockup = dynamic(() => import("@/components/landing/PlannerMockup"));
const WorkflowTimeline = dynamic(
  () => import("@/components/landing/WorkflowTimeline")
);
const FeatureGrid = dynamic(() => import("@/components/landing/FeatureGrid"));
const LiveDemo = dynamic(() => import("@/components/landing/LiveDemo"));
const SolutionsSection = dynamic(
  () => import("@/components/landing/SolutionsSection")
);
const Testimonials = dynamic(() => import("@/components/landing/Testimonials"));
const PricingSection = dynamic(() => import("@/components/landing/PricingSection"));
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"));

export default function HomePage() {
  return (
    <SmoothScroll>
      <div className="min-h-dvh bg-canvas">
        <PublicHeader />
        <main id="main">
          <Hero />
          <TrustStrip />
          <AIShowcase />
          <PlannerMockup />
          <WorkflowTimeline />
          <FeatureGrid />
          <LiveDemo />
          <SolutionsSection />
          <Testimonials />
          <PricingSection />
          <FinalCTA />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}
