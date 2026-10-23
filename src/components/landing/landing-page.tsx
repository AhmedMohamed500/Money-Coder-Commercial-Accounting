import { PremiumNavbar } from "@/components/landing/premium-navbar";
import { SignatureHero } from "@/components/landing/signature-hero";
import { ProductExperience } from "@/components/landing/product-experience";
import { AudienceSplit } from "@/components/landing/audience-split";
import { ConnectedProcess } from "@/components/landing/connected-process";
import { FutureRoadmap } from "@/components/landing/future-roadmap";
import { TrustSection } from "@/components/landing/trust-section";
import { PremiumCta } from "@/components/landing/premium-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export function LandingPage() {
  return (
    <main className="landing-page">
      <PremiumNavbar />
      <SignatureHero />
      <ProductExperience />
      <AudienceSplit />
      <ConnectedProcess />
      <FutureRoadmap />
      <TrustSection />
      <PremiumCta />
      <SiteFooter />
    </main>
  );
}
