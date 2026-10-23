import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  Building2,
  Check,
  ChevronDown,
  FileText,
  Landmark,
  LockKeyhole,
  MoreHorizontal,
  ShieldCheck,
  Users,
} from "lucide-react";

function HeroProductScene() {
  return (
    <div className="hero-scene" aria-label="معاينة توضيحية لمساحة عمل شركة داخل Money Coder">
      <div className="hero-scene__halo" />
      <div className="workspace-window reveal-up reveal-delay-2">
        <div className="workspace-window__bar">
          <div className="window-dots" aria-hidden="true"><i/><i/><i/></div>
          <span>مساحة الشركة</span>
          <MoreHorizontal aria-hidden="true" />
        </div>
        <div className="workspace-window__body">
          <aside className="workspace-sidebar">
            <div className="workspace-mark">MC</div>
            <span className="active"><Building2/><b>الملف</b></span>
            <span><Users/><b>الفريق</b></span>
            <span><FileText/><b>المستندات</b></span>
            <span><ShieldCheck/><b>الصلاحيات</b></span>
          </aside>
          <div className="workspace-content">
            <div className="workspace-topline">
              <div><small>صباح الخير</small><h3>مساحة الأفق التجارية</h3></div>
              <button aria-label="اختيار المؤسسة">شركة تجارية <ChevronDown/></button>
            </div>
            <div className="workspace-metrics">
              <div><small>اكتمال الملف</small><strong>82%</strong><i><span/></i></div>
              <div><small>أعضاء الفريق</small><strong>06</strong><em>عضوية نشطة</em></div>
              <div><small>المستندات</small><strong>12</strong><em>منظمة حسب النوع</em></div>
            </div>
            <div className="workspace-lower">
              <div className="identity-panel">
                <div className="panel-heading"><span><Building2/>هوية الشركة</span><b>بيانات تجريبية</b></div>
                <dl>
                  <div><dt>الاسم القانوني</dt><dd>شركة الأفق التجارية</dd></div>
                  <div><dt>حالة الملف</dt><dd className="status-dot">قيد الاستكمال</dd></div>
                  <div><dt>العملة الأساسية</dt><dd>EGP</dd></div>
                </dl>
              </div>
              <div className="activity-panel">
                <div className="panel-heading"><span>آخر الأنشطة</span><b>الآن</b></div>
                <ul>
                  <li><i><Check/></i><span><strong>تحديث بيانات الشركة</strong><small>بواسطة مدير الحساب</small></span></li>
                  <li><i><Users/></i><span><strong>إضافة عضو جديد</strong><small>صلاحية: مراجع</small></span></li>
                  <li><i><FileText/></i><span><strong>تنظيم مستند قانوني</strong><small>مستند تجريبي</small></span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="floating-card floating-card--identity reveal-up reveal-delay-3">
        <small>الكيان النشط</small>
        <div><span><Landmark/></span><p><strong>الأفق التجارية</strong><em>شركة تجارية</em></p></div>
      </div>
      <div className="floating-card floating-card--access reveal-up reveal-delay-4">
        <div><LockKeyhole/><span><strong>وصول مضبوط</strong><small>الصلاحيات من الخادم</small></span></div>
        <div className="access-avatars"><i>م</i><i>س</i><i>ع</i><b>+3</b></div>
      </div>
      <span className="scene-caption">واجهة توضيحية — البيانات المعروضة نموذجية</span>
    </div>
  );
}

export function SignatureHero() {
  return (
    <section className="signature-hero" id="top">
      <div className="hero-grid" aria-hidden="true" />
      <div className="premium-container signature-hero__layout">
        <div className="hero-copy">
          <p className="hero-kicker reveal-up"><span/>مساحة العمل المالية الجديدة</p>
          <h1 className="reveal-up reveal-delay-1">كل أعمالك المالية.<br/><em>في مساحة واحدة</em><br/>تتقن التفاصيل.</h1>
          <p className="hero-lead reveal-up reveal-delay-2">نظّم هوية شركتك، فريقك، صلاحيات الوصول، وعلاقتك بمكتب المحاسبة داخل مساحة مؤسسية واحدة صُممت لتبدأ بوضوح وتنمو بثقة.</p>
          <div className="hero-actions reveal-up reveal-delay-3">
            <Link href="/auth/register" className="premium-button premium-button--dark">ابدأ رحلتك <ArrowUpLeft/></Link>
            <Link href="#experience" className="premium-button premium-button--ghost">اكتشف المنصة <ArrowDownLeft/></Link>
          </div>
          <div className="hero-assurance reveal-up reveal-delay-4"><ShieldCheck/><p><strong>منصة في مرحلة التأسيس التشغيلي</strong><span>التسجيل يعتمد على جاهزية خدمات قاعدة البيانات والبريد.</span></p></div>
        </div>
        <HeroProductScene />
      </div>
      <div className="hero-footnote"><span>01</span><p>هوية مؤسسية واضحة</p><i/><p>صلاحيات محسوبة</p><i/><p>بيانات منفصلة</p></div>
    </section>
  );
}
