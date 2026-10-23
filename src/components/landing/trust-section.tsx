import { Fingerprint, KeyRound, LockKeyhole, ScrollText, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const safeguards = [
  [Fingerprint, "فصل قائم على المؤسسة", "كل عملية ترتبط بالعضوية والمؤسسة النشطة على الخادم."],
  [KeyRound, "صلاحيات خادمية", "التحقق لا يعتمد على إخفاء عناصر الواجهة وحده."],
  [LockKeyhole, "تفويض مضبوط", "لا يبدأ وصول المكتب قبل قبول الشركة، ويمكن إلغاؤه."],
  [ScrollText, "تتبّع الأحداث", "تسجيل العمليات الأساسية لدعم المراجعة والوضوح."],
] as const;

export function TrustSection() {
  return (
    <section className="trust-section" id="trust">
      <div className="premium-container trust-layout">
        <div className="trust-seal" aria-hidden="true"><span><ShieldCheck/></span><i/><i/><i/><i/><strong>ACCESS<br/>CONTROL</strong></div>
        <div>
          <SectionHeading eyebrow="ثقة تُبنى في التفاصيل" title={<>الوصول ليس افتراضًا.<br/><em>بل قرار محسوب.</em></>} description="بنية حماية عملية تناسب مرحلة المنتج الحالية، بعبارات دقيقة ومن دون شهادات أو وعود غير مثبتة." />
          <div className="safeguard-list">
            {safeguards.map(([Icon, title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><Icon/><div><h3>{title}</h3><p>{text}</p></div></article>)}
          </div>
          <p className="trust-disclaimer"><ShieldCheck/> معالجة المستندات في الإنتاج تتطلب إعداد تخزين خاص؛ التخزين المحلي مخصص للتطوير فقط.</p>
        </div>
      </div>
    </section>
  );
}
