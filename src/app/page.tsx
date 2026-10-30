import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Money Coder | إدارة شركتك تبدأ من رؤية أوضح" },
  description: "نظّم ملف شركتك وحساباتها البنكية المسجلة وفريقها وصلاحيات الوصول. استكشف رؤية محاسبية مستقبلية بأمثلة توضيحية واضحة.",
};

export default function Home() {
  return <LandingPage />;
}
