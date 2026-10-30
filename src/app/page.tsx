import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Money Coder | نظّم شركتك وحساباتها وفريقها" },
  description: "أنشئ ملف شركتك، سجّل حساباتها البنكية، ونظّم أعضاء فريقك وصلاحياتهم. استكشف أمثلة توضيحية للرؤية المحاسبية القادمة.",
};

export default function Home() {
  return <LandingPage />;
}
