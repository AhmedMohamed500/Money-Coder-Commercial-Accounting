import Link from "next/link";
import { AlertTriangle, ArrowLeft, CircleCheck, FileSpreadsheet, FileText, Landmark, ScanLine } from "lucide-react";
import { closingBankBalance, demoBankName, demoStatementPeriod, demoTransactions, money, openingBankBalance, totalCredits, totalDebits } from "./accounting-demo-data";
import { BankFlowPipeline } from "./dimensional-scenes";

const summary = [
  ["الحركات", String(demoTransactions.length)],
  ["الإيداعات", money(totalCredits)],
  ["المسحوبات", money(totalDebits)],
  ["رصيد أول المدة", money(openingBankBalance)],
  ["رصيد آخر المدة", money(closingBankBalance)],
] as const;

export function BankProcessingShowcase() {
  return (
    <section className="mc-processing af-section" id="about" aria-labelledby="mc-processing-title">
      <div className="af-container">
        <div className="mc-processing__intro">
          <div>
            <span className="mc-vision-label">رؤية تطويرية · غير متاحة حاليًا</span>
            <h2 id="mc-processing-title">من كشف البنك إلى بيانات جاهزة للمحاسبة</h2>
            <p>تصوّر لمركز مراجعة يجمع المستند والحركات والأرصدة في شاشة واحدة، مع اعتماد بشري قبل أي ترحيل.</p>
          </div>
          <Link href="#journey" className="mc-processing__link">شاهد رحلة البيانات <ArrowLeft aria-hidden="true" /></Link>
        </div>
        <div className="mc-processing__frame" aria-label="تصور واجهة لمعالجة كشف بنك ببيانات افتراضية">
          <aside className="mc-processing__rail" aria-hidden="true"><strong>MC</strong><Landmark /><FileText /><FileSpreadsheet /></aside>
          <div className="mc-processing__main">
            <header className="mc-processing__header"><div><small>مساحة المراجعة · نموذج توضيحي</small><h3>مركز معالجة الحركات البنكية</h3></div><span className="mc-processing__state"><ScanLine /> بانتظار المراجعة</span></header>
            <BankFlowPipeline />
            <div className="mc-processing__overview">
              <div className="mc-processing__file"><span className="mc-processing__pdf"><FileText />PDF</span><div><strong>كشف {demoBankName}</strong><small>{demoStatementPeriod} · مثال افتراضي</small></div><span className="mc-processing__file-state">تصوّر للاستخراج</span></div>
              <div className="mc-processing__stats">{summary.map(([label, value]) => <div key={label}><small>{label}</small><strong dir="ltr">{value}</strong></div>)}</div>
            </div>
            <div className="mc-processing__content">
              <div className="mc-processing__table-wrap">
                <div className="mc-processing__table-title"><strong>حركات كشف الحساب</strong><small>4 حركات · جميع القيم بالجنيه المصري</small></div>
                <table className="mc-processing__table">
                  <thead><tr><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th><th>المراجعة</th></tr></thead>
                  <tbody>{demoTransactions.map(item => <tr key={item.date}><td dir="ltr">{item.date}</td><td>{item.description}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td><td dir="ltr">{money(item.balance)}</td><td><span className={item.review === "مطابق" ? "mc-status mc-status--matched" : "mc-status mc-status--review"}>{item.review}</span></td></tr>)}</tbody>
                </table>
                <div className="mc-processing__mobile-list">{demoTransactions.map(item => <div key={item.date}><span dir="ltr">{item.date}</span><strong>{item.description}</strong><b dir="ltr">{item.credit ? "+" : "−"}{money(item.credit || item.debit)}</b></div>)}</div>
              </div>
              <aside className="mc-processing__review"><strong>ملخص المراجعة</strong><div><CircleCheck /> <span>حركتان متطابقتان</span><b>02</b></div><div><ScanLine /> <span>حركة تحتاج مراجعة</span><b>01</b></div><div><AlertTriangle /> <span>تحقق من تكرار محتمل</span><b>01</b></div><div className="mc-processing__export"><FileSpreadsheet /><span><b>جدول Excel منظم</b><small>تصوّر لمخرج قابل للمراجعة</small></span></div></aside>
            </div>
            <p className="mc-processing__footnote">كل الأرقام والملفات المعروضة افتراضية. المعالجة والاستخراج والمطابقة ليست وظائف مفعّلة في الموقع الحالي.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
