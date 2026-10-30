import { getSessionUser } from "@/lib/auth";
import { ExecutiveV8Landing } from "@/components/landing/executive-v8";

export async function LandingPage() {
  const signedIn = Boolean(await getSessionUser());
  return <ExecutiveV8Landing signedIn={signedIn} />;
}
