import { ArrowUpLeft, Building2, Check, Landmark, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const officePoints = ["إدارة شركات العملاء من سياق واحد", "تعيين الموظفين بحسب كل ارتباط", "فصل بيانات كل شركة عن الأخرى", "العمل بتفويض واضح وقابل للإلغاء"];
const companyPoints = ["حفظ الهوية والبيانات القانونية", "تنظيم الإعداد المالي والحسابات البنكية", "إدارة الموظفين والأدوار", "تفويض مكتب محاسبة عند الحاجة"];

export function AudienceSplit() {
  return (
    <section className="audience-section" id="audiences">
      <div className="premium-container audience-intro">
        <p><span/>منظوران. بنية واحدة.</p>
        <h2>مساحة تعرف من أنت،<br/><em>وتعمل بالطريقة التي تناسبك.</em></h2>
      </div>
      <div className="audience-stage">
        <article className="audience-panel audience-panel--office">
          <div className="audience-panel__content">
            <span className="audience-number">01 / مكاتب المحاسبة</span>
            <Landmark className="audience-icon"/>
            <h3>كل شركات عملائك.<br/><em>تحت سيطرتك.</em></h3>
            <p>صمّم فريقك حول احتياجات كل عميل، من دون خلط البيانات أو منح وصول أوسع من المطلوب.</p>
            <ul>{officePoints.map(point => <li key={point}><Check/>{point}</li>)}</ul>
          </div>
          <div className="office-visual" aria-label="معاينة توضيحية لمحفظة عملاء مكتب محاسبة">
            <div className="office-visual__top"><p><small>محفظة العملاء</small><strong>مساحة المكتب</strong></p><span>بيانات تجريبية</span></div>
            <div className="client-row active"><i>ن</i><p><strong>النور التجارية</strong><small>3 موظفين معينين</small></p><b>نشط</b></div>
            <div className="client-row"><i>م</i><p><strong>مدار للصناعات</strong><small>2 موظفين معينين</small></p><b>نشط</b></div>
            <div className="client-row"><i>ر</i><p><strong>رؤية للاستيراد</strong><small>طلب تفويض</small></p><b className="pending">معلّق</b></div>
            <div className="office-access"><ShieldCheck/><p><strong>فصل مستقل للبيانات</strong><small>صلاحيات كل شركة تُدار بصورة منفصلة.</small></p></div>
          </div>
        </article>
        <article className="audience-panel audience-panel--company">
          <div className="company-visual" aria-label="معاينة توضيحية لملف شركة">
            <div className="company-ring"><span>82<small>%</small></span><p>اكتمال ملف الشركة</p></div>
            <div className="company-data-strip"><span><Building2/></span><p><small>الكيان</small><strong>شركة الأفق التجارية</strong></p><b>موثق داخليًا</b></div>
            <div className="company-mini-grid"><div><Users/><strong>06</strong><small>أعضاء</small></div><div><Landmark/><strong>02</strong><small>حسابات بنكية</small></div><div><ShieldCheck/><strong>04</strong><small>أدوار</small></div></div>
          </div>
          <div className="audience-panel__content">
            <span className="audience-number">02 / الشركات التجارية</span>
            <Building2 className="audience-icon"/>
            <h3>شركتك لها مساحة.<br/><em>وكل تفصيلة فيها محسوبة.</em></h3>
            <p>كوّن مرجعًا مؤسسيًا واضحًا لبيانات شركتك، وتحكم فيمن يشاركك العمل.</p>
            <ul>{companyPoints.map(point => <li key={point}><Check/>{point}</li>)}</ul>
            <Link href="/auth/register" className="text-link">ابدأ بإنشاء مساحتك <ArrowUpLeft/></Link>
          </div>
        </article>
      </div>
    </section>
  );
}
