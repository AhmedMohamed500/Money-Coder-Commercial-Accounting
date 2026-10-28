"use client";

import { useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({
  nav,
  signedIn,
}: {
  nav: readonly (readonly [string, string])[];
  signedIn: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menu.current?.removeAttribute("open");

  return (
    <details className="af-mobile-menu" ref={menu}>
      <summary aria-label="فتح قائمة التنقل"><Menu className="open" /><X className="close" /></summary>
      <nav aria-label="التنقل على الهاتف">
        {nav.map(([label, href]) => <Link key={href} href={href} onClick={closeMenu}>{label}</Link>)}
        <Link href={signedIn ? "/dashboard" : "/auth/login"} onClick={closeMenu}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link>
        <Link href={signedIn ? "/dashboard" : "/auth/register"} onClick={closeMenu}>{signedIn ? "حسابي" : "إنشاء حساب مجاني"}</Link>
      </nav>
    </details>
  );
}
