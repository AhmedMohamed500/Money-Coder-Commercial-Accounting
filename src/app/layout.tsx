import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-display",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Money Coder | المحاسبة التجارية الذكية", template: "%s | Money Coder" },
  description: "منصة تأسيس وإدارة ملفات الشركات ومكاتب المحاسبة بصلاحيات واضحة وعزل آمن للبيانات.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} ${plexArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
