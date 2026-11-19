import { getSessionUser } from "@/lib/auth";
import { FinalLanding } from "@/components/landing/final/final-landing";

export async function LandingPage() {
  const signedIn = Boolean(await getSessionUser());
  return <FinalLanding signedIn={signedIn} />;
}
