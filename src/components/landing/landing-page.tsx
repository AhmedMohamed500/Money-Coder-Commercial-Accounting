import { getSessionUser } from "@/lib/auth";
import { FinancialControlV9 } from "@/components/landing/v9/financial-control-v9";

export async function LandingPage() {
  const signedIn = Boolean(await getSessionUser());
  return <FinancialControlV9 signedIn={signedIn} />;
}
