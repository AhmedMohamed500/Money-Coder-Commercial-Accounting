import { ArrowLeft, CircleCheck, FileSpreadsheet, FileText } from "lucide-react";
import { customerCollectionEntry, demoTransactions } from "./accounting-demo-data";

export type FactoryCost = "materials" | "labor" | "overhead";

export function FinancialFlowSignature() {
  return <div className="mc-flow-signature" aria-label="من المستند إلى المعاملة ثم القيد ودفتر الأستاذ والتقرير">
    <span>مستند</span><i /><span>حركة</span><i /><span>قيد</span><i /><span>أستاذ</span><i /><span>قرار</span>
  </div>;
}

export function BankFlowPipeline() {
  return <div className="mc-bank-flow" aria-label="رحلة توضيحية من كشف البنك إلى المراجعة البشرية ثم بيانات منظمة">
    <div className="mc-bank-flow__step"><FileText aria-hidden="true"/><div><strong>كشف البنك</strong><span>مستند PDF افتراضي</span></div></div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__step"><CircleCheck aria-hidden="true"/><div><strong>مراجعة بشرية</strong><span>تأكيد الحركة والاستثناءات</span></div></div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__step"><FileSpreadsheet aria-hidden="true"/><div><strong>بيانات منظمة</strong><span>جدول Excel توضيحي</span></div></div>
    <p className="mc-bank-flow__continuity">مثال تحصيل عميل {demoTransactions[0].reference}: بعد المراجعة، قيد {customerCollectionEntry.reference} يجعل البنك مدينًا والعملاء دائنًا. العرض توضيحي فقط.</p>
  </div>;
}
