import Link from "next/link";
import { ArrowUpLeft, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { getSessionUser } from "@/lib/auth";

const links = [
  ["التجربة", "#experience"],
  ["لمن؟", "#audiences"],
  ["كيف تبدأ", "#process"],
  ["المستقبل", "#future"],
];

export async function PremiumNavbar() {
  const user = await getSessionUser();
  return (
    <header className="premium-nav-wrap">
      <nav className="premium-nav" aria-label="التنقل الرئيسي">
        <Brand compact />
        <div className="premium-nav__links">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </div>
        <div className="premium-nav__actions">
          {user ? (
            <Link className="premium-button premium-button--dark premium-button--small" href="/dashboard">لوحة التحكم <ArrowUpLeft /></Link>
          ) : (
            <>
              <Link className="premium-nav__login" href="/auth/login">تسجيل الدخول</Link>
              <Link className="premium-button premium-button--dark premium-button--small" href="/auth/register">ابدأ الآن <ArrowUpLeft /></Link>
            </>
          )}
        </div>
        <details className="premium-mobile-menu">
          <summary aria-label="فتح قائمة التنقل"><Menu className="menu-open"/><X className="menu-close"/></summary>
          <div>
            {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
            <Link href="/auth/login">تسجيل الدخول</Link>
            <Link className="premium-button premium-button--dark" href={user ? "/dashboard" : "/auth/register"}>{user ? "لوحة التحكم" : "ابدأ الآن"}</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
