import { Building2, Check, FileKey2, Landmark, Scale, ShieldCheck, Users } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

export function ProductExperience() {
  return (
    <section className="product-experience" id="experience">
      <div className="premium-container">
        <SectionHeading eyebrow="التجربة الأساسية" title={<>بيانات شركتك.<br/><em>منظمة كما يجب أن تكون.</em></>} description="من الهوية القانونية إلى أعضاء الفريق، كل معلومة في سياقها الصحيح، وكل صلاحية مرتبطة بدورها." />
        <div className="product-bento">
          <article className="bento-main">
            <div className="bento-label"><span>01</span><p>ملف المؤسسة</p><b>مساحة موحدة</b></div>
            <div className="profile-preview">
              <header><div><span className="preview-icon"><Building2/></span><p><small>شركة تجارية</small><strong>شركة النور للتجارة</strong></p></div><em>بيانات تجريبية</em></header>
              <div className="completion-row"><p><strong>ملف الشركة</strong><span>4 من 6 خطوات مكتملة</span></p><b>67%</b></div>
              <div className="completion-track"><span/></div>
              <div className="profile-fields">
                <div><small>السجل التجاري</small><strong>منظم ومحفوظ</strong><Check/></div>
                <div><small>البيانات الضريبية</small><strong>مربوطة بالكيان</strong><Check/></div>
                <div><small>الحسابات البنكية</small><strong>متعددة العملات</strong><Landmark/></div>
                <div><small>جهات الاتصال</small><strong>ضمن ملف واحد</strong><Users/></div>
              </div>
            </div>
          </article>
          <article className="bento-permissions">
            <div className="bento-label"><span>02</span><p>العضويات والصلاحيات</p></div>
            <h3>كل شخص يرى ما يحتاجه فقط.</h3>
            <div className="role-list">
              <div><i>أم</i><p><strong>أحمد محمود</strong><small>مالك الشركة</small></p><b>كامل</b></div>
              <div><i>سم</i><p><strong>سارة محمد</strong><small>مراجع</small></p><b>قراءة</b></div>
              <div><i>عح</i><p><strong>عمر حسن</strong><small>محاسب</small></p><b>مخصص</b></div>
            </div>
          </article>
          <article className="bento-legal">
            <div className="legal-orbit" aria-hidden="true"><i/><i/><i/></div>
            <Scale/>
            <small>البيانات القانونية والضريبية</small>
            <h3>مرجع واحد.<br/>دائم الوضوح.</h3>
            <p>العناوين، التسجيل، والهوية المؤسسية في بنية قابلة للمراجعة.</p>
          </article>
          <article className="bento-delegation">
            <div className="bento-label"><span>03</span><p>تفويض مكتب المحاسبة</p><b>تحت سيطرتك</b></div>
            <div className="delegation-flow">
              <div><Building2/><span><small>الشركة</small><strong>النور التجارية</strong></span></div>
              <p><i/><i/><i/><ShieldCheck/></p>
              <div><Landmark/><span><small>مكتب المحاسبة</small><strong>الرؤية المهنية</strong></span></div>
            </div>
            <div className="delegation-note"><FileKey2/><p><strong>وصول قابل للإلغاء</strong><span>لا يبدأ الوصول حتى تقبل الشركة الطلب.</span></p></div>
          </article>
        </div>
      </div>
    </section>
  );
}
