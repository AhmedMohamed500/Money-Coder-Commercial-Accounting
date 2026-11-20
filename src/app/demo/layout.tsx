import type { Metadata } from "next";
import { DemoProvider } from "@/demo/state/demo-provider";
import "./demo.css";

export const metadata: Metadata = {
  title: "العرض التفاعلي — بيانات افتراضية",
  description: "تجربة Money Coder التفاعلية المعزولة ببيانات افتراضية دون اتصال بخدمات الإنتاج.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
