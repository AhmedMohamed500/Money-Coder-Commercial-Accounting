import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="premium-footer">
      <div className="premium-container">
        <div className="footer-main">
          <div className="footer-brand"><Brand/><p>مساحة مؤسسية عربية لتنظيم هوية الشركات، فرق العمل، الصلاحيات، وتفويضات مكاتب المحاسبة.</p></div>
          <div><strong>المنصة</strong><Link href="#experience">تجربة المنتج</Link><Link href="#audiences">للشركات والمكاتب</Link><Link href="#future">الرؤية القادمة</Link></div>
          <div><strong>الوصول</strong><Link href="/auth/login">تسجيل الدخول</Link><Link href="/auth/register">إنشاء حساب</Link><Link href="/api/health">حالة الخدمات</Link></div>
          <Link href="#top" className="back-to-top" aria-label="العودة إلى أعلى الصفحة"><ArrowUpLeft/></Link>
        </div>
        <div className="footer-bottom"><p>Money Coder © 2026</p><p>Where money meets code.</p><span>المنتج في مرحلة التأسيس التشغيلي</span></div>
      </div>
    </footer>
  );
}
