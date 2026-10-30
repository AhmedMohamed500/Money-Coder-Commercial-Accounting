import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BankFlowPipeline } from "./dimensional-scenes";

export function BankProcessingShowcase() {
  return <section className="mc-approved-pipeline af-section" id="about" aria-labelledby="mc-processing-title"><div className="af-container">
    <div className="mc-approved-pipeline__frame">
      <div className="mc-approved-pipeline__intro"><div><span>تصور مستقبلي · بيانات افتراضية</span><h2 id="mc-processing-title">من كشف البنك إلى بيانات منظمة</h2><p>مثال يربط كشف PDF بمراجعة الحركة ثم جدول Excel. الاعتماد البشري شرط قبل أي قيد في الرؤية القادمة.</p></div><Link href="#journey">تعرّف إلى الرحلة <ArrowLeft aria-hidden="true" /></Link></div>
      <BankFlowPipeline />
      <p className="mc-approved-pipeline__note">هذا العرض توضيحي؛ استخراج الكشوف وتصدير Excel والمطابقة غير مفعّلة في المنتج الحالي.</p>
    </div>
  </div></section>;
}
