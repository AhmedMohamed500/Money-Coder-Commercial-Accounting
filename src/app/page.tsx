import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Money Coder | Financial Twin للمحاسبة التجارية" },
  description: "منصة محاسبية عربية للشركات ومكاتب المحاسبة، تجمع مساحة العمل والصلاحيات والمستندات مع رؤية Financial Twin مالية مترابطة.",
};

export default function Home() {
  return <LandingPage />;
}
