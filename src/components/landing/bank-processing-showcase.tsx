import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BankFlowPipeline } from "./dimensional-scenes";
import { closingBankBalance, demoAccountNumber, demoBankName, demoStatementPeriod, demoTransactions, money, openingBankBalance, totalCredits, totalDebits } from "./accounting-demo-data";

export function BankProcessingShowcase() {
  return <section className="mc-approved-pipeline af-section" id="about" aria-labelledby="mc-processing-title"><div className="af-container">
    <div className="mc-approved-pipeline__frame">
      <div className="mc-approved-pipeline__intro"><div><span>معاينة توضيحية · ضمن خطة التطوير</span><h2 id="mc-processing-title">من كشف البنك إلى بيانات منظمة</h2><p>مثال يربط كشف PDF بمراجعة الحركة ثم جدول Excel. الاعتماد البشري شرط قبل أي قيد في الرؤية القادمة.</p></div><Link href="#journey">تعرّف إلى الرحلة <ArrowLeft aria-hidden="true" /></Link></div>
      <BankFlowPipeline />
      <div className="mc-bank-review" aria-label="معاينة توضيحية لمساحة مراجعة كشف بنكي افتراضي">
        <header><div><small>مساحة مراجعة افتراضية · لا معالجة فعلية</small><h3>مراجعة كشف {demoBankName}</h3><p>{demoStatementPeriod} · حساب <b dir="ltr">{demoAccountNumber}</b></p></div><span>{demoTransactions.length} حركات</span></header>
        <div className="mc-bank-review__totals"><div><small>رصيد افتتاحي</small><strong dir="ltr">{money(openingBankBalance)} EGP</strong></div><div><small>إيداعات</small><strong dir="ltr">{money(totalCredits)} EGP</strong></div><div><small>مسحوبات</small><strong dir="ltr">{money(totalDebits)} EGP</strong></div><div><small>رصيد إقفال</small><strong dir="ltr">{money(closingBankBalance)} EGP</strong></div></div>
        <div className="mc-bank-review__table"><table><thead><tr><th>المرجع</th><th>الحركة</th><th>التاريخ</th><th>مدين</th><th>دائن</th><th>الرصيد</th><th>المراجعة</th></tr></thead><tbody>{demoTransactions.map(item => <tr key={item.reference}><td dir="ltr">{item.reference}</td><td>{item.description}</td><td dir="ltr">{item.date}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td><td dir="ltr">{money(item.balance)}</td><td>{item.review}</td></tr>)}</tbody></table></div>
        <div className="mc-bank-review__mobile">{demoTransactions.map(item => <article key={item.reference}><div><strong>{item.description}</strong><small dir="ltr">{item.reference} · {item.date}</small></div><b dir="ltr">{item.credit ? "+" : "−"}{money(item.credit || item.debit)} EGP</b><span>{item.review} · رصيد {money(item.balance)}</span></article>)}</div>
        <div className="mc-bank-review__exceptions"><strong>استثناءات تحتاج قرارًا بشريًا</strong>{demoTransactions.filter(item => item.review !== "مطابق").map(item => <p key={item.reference}><b dir="ltr">{item.reference}</b> · {item.reviewReason}</p>)}</div>
      </div>
      <p className="mc-approved-pipeline__note">هذا العرض توضيحي؛ استخراج الكشوف وتصدير Excel والمطابقة غير مفعّلة في المنتج الحالي.</p>
    </div>
  </div></section>;
}
