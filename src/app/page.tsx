import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SmoothScroll from "@/components/site/SmoothScroll";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import AIShowcase from "@/components/landing/AIShowcase";
import PlannerMockup from "@/components/landing/PlannerMockup";
import WorkflowTimeline from "@/components/landing/WorkflowTimeline";
import FeatureGrid from "@/components/landing/FeatureGrid";
import LiveDemo from "@/components/landing/LiveDemo";
import SolutionsSection from "@/components/landing/SolutionsSection";
import Testimonials from "@/components/landing/Testimonials";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTA from "@/components/landing/FinalCTA";

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
