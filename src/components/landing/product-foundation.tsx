import { Building2, Check, FileText, Landmark, ShieldCheck, Users } from "lucide-react";

const setup = ["بيانات أساسية", "قانونية وضريبية", "العنوان والتواصل", "الإعداد المحاسبي", "الحسابات البنكية", "المراجعة والمستندات"];

export function ProductFoundation() {
  return <section className="mc-foundation af-section" id="platform" aria-labelledby="mc-foundation-title">
    <div className="af-container">
      <div className="mc-approved-heading"><span className="mc-section-kicker">ما يمكنك تنظيمه اليوم</span><h2 id="mc-foundation-title">ابدأ بالأساس الصح لإدارة شركتك</h2><p>ملف شركتك وحساباتها وفريقها في مساحة منظمة، مع صلاحيات واضحة لكل دور.</p></div>
      <div className="mc-foundation__workspace" aria-label="معاينة توضيحية لمساحة الشركة ببيانات افتراضية">
        <div className="mc-foundation__sidebar"><strong>Money Coder</strong><span><Building2 /> ملف الشركة</span><span><Landmark /> الحسابات البنكية</span><span><Users /> أعضاء الفريق</span><span><ShieldCheck /> صلاحيات المكتب</span></div>
        <div className="mc-foundation__main"><header><div><small>مساحة الشركة · بيانات توضيحية</small><h3>شركة المثال التجارية</h3></div><span className="mc-foundation__status"><Check /> ملف قابل للمراجعة</span></header>
          <div className="mc-foundation__summary"><div><small>نوع الكيان</small><strong>شركة تجارية</strong></div><div><small>العملة الأساسية</small><strong>الجنيه المصري</strong></div><div><small>بداية السنة المالية</small><strong>يناير</strong></div></div>
          <div className="mc-foundation__steps"><strong>خطوات إعداد الملف</strong><ol>{setup.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol></div>
          <p><FileText /> تشمل بيانات الملف المعلومات القانونية والضريبية والتواصل والإعداد المحاسبي بحسب حقول المنصة الحالية.</p>
        </div>
      </div>
      <div className="mc-foundation__support">
        <article><span><Landmark /> حسابات الشركة البنكية</span><strong>حساب مسجل في ملف الشركة</strong><p>اسم البنك والفرع واسم الحساب ورقمه وعملته. هذا تسجيل للبيانات، وليس ربطًا آليًا بالبنك.</p></article>
        <article><span><Users /> الفريق والصلاحيات</span><strong>وصول مرتبط بالعضوية والدور</strong><p>أعضاء الفريق يعملون داخل حدود دورهم في الشركة؛ عرض البيانات يتبع الصلاحيات الفعلية.</p></article>
        <article><span><ShieldCheck /> التعاون مع مكتب محاسبة</span><strong>التفويض يبدأ بموافقة الشركة</strong><p>يمكن للمكتب طلب التعاون. لا يحصل على الوصول قبل قبول الشركة للتفويض.</p></article>
      </div>
      <p className="mc-foundation__note">المعاينة والاسم والبيانات أمثلة توضيحية. واجهات إعداد الشركة والحسابات والعضويات والتفويض مستندة إلى وظائف موجودة في المشروع.</p>
    </div>
  </section>;
}
