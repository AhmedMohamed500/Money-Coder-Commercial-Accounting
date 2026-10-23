import { Building2, Check, Landmark, ShieldCheck, UserRoundCheck } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  { n: "01", title: "اختر نوع حسابك", text: "ابدأ كشركة تجارية أو مكتب محاسبة، بهوية عمل واضحة من اللحظة الأولى.", icon: Building2, meta: "شركة أو مكتب" },
  { n: "02", title: "أكمل ملف كيانك", text: "أضف البيانات الأساسية والقانونية ووسائل الاتصال والإعدادات بصورة تدريجية.", icon: Landmark, meta: "حفظ مرن للمسودة" },
  { n: "03", title: "نظّم فريقك والوصول", text: "وزّع الأدوار، وأدر التفويضات، واحتفظ بقرار الوصول داخل مؤسستك.", icon: UserRoundCheck, meta: "صلاحيات من الخادم" },
];

export function ConnectedProcess() {
  return (
    <section className="process-section" id="process">
      <div className="premium-container">
        <SectionHeading eyebrow="رحلة البداية" title={<>ثلاث خطوات.<br/><em>أساس أوضح للعمل.</em></>} description="تجربة تأسيس مباشرة تمنح كل معلومة مكانها من دون تعقيد غير ضروري." />
        <div className="process-timeline">
          <div className="process-line" aria-hidden="true"><span/></div>
          {steps.map(({ n, title, text, icon: Icon, meta }, index) => (
            <article className={`process-step process-step--${index + 1}`} key={n}>
              <div className="process-step__number">{n}</div>
              <div className="process-step__visual">
                <span className="process-icon"><Icon/></span>
                <div className="mini-form">
                  <div><i/><p><small>{index === 0 ? "نوع المساحة" : index === 1 ? "بيانات الكيان" : "الوصول"}</small><strong>{meta}</strong></p><Check/></div>
                  <span/><span className="short"/>
                  <button tabIndex={-1}>{index === 2 ? <><ShieldCheck/>تم الضبط</> : "متابعة"}</button>
                </div>
              </div>
              <div className="process-step__copy"><small>الخطوة {n}</small><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
