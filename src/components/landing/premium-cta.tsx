import Link from "next/link";
import { ArrowUpLeft, ShieldCheck } from "lucide-react";

export function PremiumCta() {
  return (
    <section className="cta-section">
      <div className="premium-container">
        <div className="signature-cta">
          <div className="cta-orbit" aria-hidden="true"><i/><i/><i/></div>
          <p className="cta-kicker"><span/>البداية الأذكى</p>
          <h2>المنظومة المالية القادمة<br/><em>تبدأ من تنظيم شركتك اليوم.</em></h2>
          <p>أنشئ مساحة مؤسستك، رتّب بياناتها، وحدد من يشاركك الوصول منذ الخطوة الأولى.</p>
          <Link href="/auth/register" className="premium-button premium-button--light">ابدأ رحلتك <ArrowUpLeft/></Link>
          <div className="cta-status"><ShieldCheck/><span>قد يتوقف التسجيل مؤقتًا حتى اكتمال تهيئة قاعدة البيانات والبريد في بيئة الإنتاج.</span></div>
        </div>
      </div>
    </section>
  );
}
