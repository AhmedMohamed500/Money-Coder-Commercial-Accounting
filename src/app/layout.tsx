import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Money Coder | المحاسبة التجارية الذكية", template: "%s | Money Coder" },
  description: "منصة تأسيس وإدارة ملفات الشركات ومكاتب المحاسبة بصلاحيات واضحة وعزل آمن للبيانات.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
