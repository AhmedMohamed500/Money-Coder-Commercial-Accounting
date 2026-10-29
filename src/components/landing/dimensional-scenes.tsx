import { ArrowLeft, CircleCheck, FileSpreadsheet, FileText, Layers3 } from "lucide-react";
import { closingBankBalance, customerCollectionEntry, demoAccountNumber, demoBankName, demoStatementPeriod, demoTransactions, money, openingBankBalance } from "./accounting-demo-data";

export type FactoryCost = "materials" | "labor" | "overhead";

export function FinancialFlowSignature() {
  return <div className="mc-flow-signature" aria-label="من المستند إلى المعاملة ثم القيد ودفتر الأستاذ والتقرير">
    <span>مستند</span><i /><span>حركة</span><i /><span>قيد</span><i /><span>أستاذ</span><i /><span>قرار</span>
  </div>;
}

export function BankFlowPipeline() {
  const flagged = demoTransactions[2];
  return <div className="mc-bank-flow" aria-label="تصور لرحلة كشف بنك افتراضي من المستند إلى Excel والمراجعة البشرية">
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--pdf">
      <div className="mc-bank-flow__head"><span className="mc-bank-flow__type"><FileText /> PDF · صفحة 1 / 1</span><b>{demoBankName}</b></div>
      <strong>كشف حساب · {demoStatementPeriod}</strong>
      <div className="mc-bank-flow__meta"><span>حساب <b dir="ltr">{demoAccountNumber}</b></span><span>افتتاحي <b dir="ltr">{money(openingBankBalance)}</b></span></div>
      <table className="mc-bank-flow__table"><thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>{demoTransactions.map(item => <tr key={item.reference}><td dir="ltr">{item.date}</td><td>{item.description}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td><td dir="ltr">{money(item.balance)}</td></tr>)}</tbody></table>
      <small className="mc-bank-flow__closing">رصيد الإقفال <b dir="ltr">{money(closingBankBalance)} EGP</b></small>
    </div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--review">
      <div className="mc-bank-flow__head"><span className="mc-bank-flow__type"><Layers3 /> مساحة المراجعة</span><b>مسودة فقط</b></div>
      <strong>الحركة {flagged.reference}</strong>
      <div className="mc-bank-flow__review-line"><span>الأصل من الكشف</span><b>{flagged.description} · <span dir="ltr">{money(flagged.debit)} EGP</span></b></div>
      <div className="mc-bank-flow__review-line"><span>البيانات المستخرجة</span><b>مصروف · <span dir="ltr">03/06/2026</span></b></div>
      <div className="mc-bank-flow__exception"><span>{flagged.review}</span><p>{flagged.reviewReason}</p></div>
      <small><CircleCheck /> تحقق بشري مطلوب قبل اقتراح القيد أو الترحيل</small>
    </div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--excel">
      <div className="mc-bank-flow__head"><span className="mc-bank-flow__type"><FileSpreadsheet /> Excel توضيحي</span><b>الحركات</b></div>
      <strong>ورقة منظمة قابلة للفحص</strong>
      <div className="mc-bank-flow__letters" aria-hidden="true">A　 B　 C　 D　 E　 F</div>
      <table className="mc-bank-flow__table"><thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th><th>حالة</th></tr></thead><tbody>{demoTransactions.map(item => <tr key={item.reference}><td dir="ltr">{item.date}</td><td>{item.description}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td><td dir="ltr">{money(item.balance)}</td><td>{item.review}</td></tr>)}</tbody></table>
      <small className="mc-bank-flow__closing">الرصيد <b dir="ltr">{money(closingBankBalance)} EGP</b></small>
    </div>
    <p className="mc-bank-flow__continuity">مثال حركة تحصيل عميل {demoTransactions[0].reference}: كشف البنك ← صف Excel ← مراجعة بشرية ← قيد {customerCollectionEntry.reference} (البنك مدين / العملاء دائن) ← الأستاذ ← ميزان المراجعة.</p>
  </div>;
}
