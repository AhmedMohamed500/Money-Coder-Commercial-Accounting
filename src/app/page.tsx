import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Money Coder | من المستند إلى القرار" },
  description: "نظّم شركتك وفريقها وحساباتها البنكية المسجلة، واستكشف رحلة مالية تفاعلية ومحاكاة قرارات ببيانات افتراضية واضحة.",
};

export default function Home() {
  return <LandingPage />;
}
