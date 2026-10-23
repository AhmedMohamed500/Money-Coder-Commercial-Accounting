import Link from "next/link";
import { Brand } from "@/components/brand";
import { getSessionUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="container-shell flex min-h-20 items-center justify-between gap-5">
        <Brand compact />
        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex" aria-label="التنقل الرئيسي">
          <Link href="/#platform">المنصة</Link><Link href="/#audiences">لمن؟</Link><Link href="/#roadmap">خارطة الطريق</Link><Link href="/#how">كيف تعمل؟</Link>
        </nav>
        <div className="flex gap-2">
          {user ? <Link className="btn-primary text-sm" href="/dashboard">لوحة التحكم</Link> : <><Link className="btn-secondary hidden text-sm sm:inline-flex" href="/auth/login">تسجيل الدخول</Link><Link className="btn-primary text-sm" href="/auth/register">ابدأ الآن</Link></>}
        </div>
      </div>
    </header>
  );
}
