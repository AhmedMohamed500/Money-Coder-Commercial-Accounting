"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Check, CircleAlert, FileSpreadsheet, FileText, Landmark, Scale } from "lucide-react";
import { closingBankBalance, customerCollectionEntry, demoAccountNumber, demoBankName, demoStatementPeriod, demoTransactions, financialPosition, incomeStatement, money, openingBankBalance, totalCredits, totalDebits, trialBalance, trialCreditTotal, trialDebitTotal } from "./accounting-demo-data";

function StageTitle({ number, title, description }: { number: number; title: string; description: string }) {
  return <div className="mc-journey__stage-title"><span className="mc-journey__number">{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>;
}

function StatementPreview() {
  return <div className="mc-document" aria-label="نموذج كشف حساب بنكي افتراضي">
    <div className="mc-document__upload"><FileText /><span><b>كشف-حساب-يونيو.pdf</b><small>PDF · ملف افتراضي</small></span><i>معاينة فقط</i></div>
    <div className="mc-document__paper">
      <header><span className="mc-document__bank"><Landmark /> {demoBankName}</span><small>كشف حساب · {demoStatementPeriod}</small></header>
      <div className="mc-document__account"><span>شركة المثال التجارية · حساب افتراضي</span><b dir="ltr">{demoAccountNumber}</b></div>
      <div className="mc-document__row mc-document__row--head"><span>التاريخ</span><span>البيان</span><span>مدين</span><span>دائن</span><span>الرصيد</span></div>
      {demoTransactions.map(item => <div className="mc-document__row" key={item.reference}><span dir="ltr">{item.date}</span><span>{item.description}</span><span dir="ltr">{item.debit ? money(item.debit) : "—"}</span><span dir="ltr">{item.credit ? money(item.credit) : "—"}</span><span dir="ltr">{money(item.balance)}</span></div>)}
      <footer><span>افتتاحي <b dir="ltr">{money(openingBankBalance)}</b></span><span>إيداعات <b dir="ltr">{money(totalCredits)}</b></span><span>مسحوبات <b dir="ltr">{money(totalDebits)}</b></span><span>إقفال <b dir="ltr">{money(closingBankBalance)}</b></span></footer>
      <small className="mc-document__page">صفحة 1 من 1 · جميع القيم بالجنيه المصري</small>
    </div>
  </div>;
}

function ExcelPreview() {
  return <div className="mc-excel" aria-label="نموذج جدول Excel منظم للحركات البنكية">
    <header><span className="mc-excel__icon"><FileSpreadsheet /></span><div><strong>الحركات-المنظمة.xlsx</strong><small>ورقة مراجعة افتراضية</small></div><span className="mc-excel__sheet">Sheet 1</span></header>
    <div className="mc-excel__letters" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span></div>
    <div className="mc-excel__formula"><b dir="ltr">E3</b><code dir="ltr">=E2+D3-C3</code><span>الرصيد بعد تحصيل العميل: <b dir="ltr">{money(demoTransactions[0].balance)}</b></span></div>
    <table><thead><tr><th scope="col">1</th><th scope="col">التاريخ</th><th scope="col">الوصف</th><th scope="col">مدين</th><th scope="col">دائن</th><th scope="col">الرصيد</th><th scope="col">المراجعة</th></tr></thead><tbody><tr><th scope="row">2</th><td>رصيد افتتاحي</td><td>—</td><td>—</td><td>—</td><td dir="ltr">{money(openingBankBalance)}</td><td>مرجع</td></tr>{demoTransactions.map((item, index) => <tr key={item.reference}><th scope="row">{index + 3}</th><td dir="ltr">{item.date}</td><td>{item.description}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td><td dir="ltr">{money(item.balance)}</td><td>{item.review}</td></tr>)}</tbody></table>
    <div className="mc-excel__mobile">{demoTransactions.map(item => <div key={item.reference}><span dir="ltr">{item.date}</span><strong>{item.description}</strong><b dir="ltr">{item.credit ? "+" : "−"}{money(item.credit || item.debit)}</b><small>{item.review} · رصيد {money(item.balance)}</small></div>)}</div>
    <footer><span>إيداعات <b dir="ltr">{money(totalCredits)}</b></span><span>مسحوبات <b dir="ltr">{money(totalDebits)}</b></span><span>إقفال <b dir="ltr">{money(openingBankBalance)} + {money(totalCredits)} − {money(totalDebits)} = {money(closingBankBalance)}</b></span></footer>
    <div className="mc-excel__tabs"><b>الحركات البنكية</b><span>ملخص المراجعة</span><small>ورقة افتراضية · لا يوجد تصدير فعلي</small></div>
  </div>;
}

function ReviewPreview() {
  return <div className="mc-review-ui" aria-label="تصور شاشة مراجعة استيراد Excel">
    <header><span><FileSpreadsheet /> الحركات-المنظمة.xlsx</span><small>مسودة استيراد · دون ترحيل</small></header>
    <div className="mc-review-ui__mapping"><strong>مطابقة الأعمدة</strong><div><span>تاريخ الحركة <ArrowLeft /> تاريخ القيد</span><span>المبلغ <ArrowLeft /> مدين / دائن</span></div></div>
    <div className="mc-review-ui__checks"><span><Check /> تنسيق التواريخ سليم</span><span><Check /> رصيد الإقفال متسق</span><span className="mc-review-ui__warning"><CircleAlert /> حركة تحتاج مراجعة</span></div>
    {demoTransactions.filter(item => item.review !== "مطابق").map(item => <div className="mc-review-ui__case" key={item.reference}><div className="mc-review-ui__row"><span dir="ltr">{item.date}</span><strong>{item.description}</strong><b dir="ltr">{money(item.debit || item.credit)} EGP</b><em>{item.review}</em></div><p><b dir="ltr">{item.reference}</b> · {item.reviewReason}</p></div>)}
    <p>الاعتماد اليدوي مطلوب قبل تحويل أي حركة إلى قيد نهائي.</p>
  </div>;
}

function JournalPreview() {
  return <div className="mc-journal-ui" aria-label="قيد يومية توضيحي متوازن">
    <header><div><small>دفتر اليومية · مستند {demoTransactions[0].reference}</small><strong>تحصيل مستحق من عميل</strong></div><span dir="ltr">{customerCollectionEntry.reference}</span></header>
    <div className="mc-journal-ui__meta"><span>التاريخ: <b dir="ltr">{customerCollectionEntry.date}</b></span><span>الحالة: <b>قيد مقترح · بانتظار الاعتماد</b></span></div>
    <table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody><tr><td><span>1010</span> البنك</td><td dir="ltr">{money(customerCollectionEntry.bankDebit)}</td><td>—</td></tr><tr><td><span>1110</span> العملاء</td><td>—</td><td dir="ltr">{money(customerCollectionEntry.receivablesCredit)}</td></tr></tbody></table>
    <footer><span><Scale /> إجمالي المدين = إجمالي الدائن</span><strong dir="ltr">{money(customerCollectionEntry.bankDebit)} EGP</strong></footer>
    <p className="mc-journal-ui__note">تحصيل ذمة قائمة؛ يزيد البنك وتنخفض حسابات العملاء. لا يُسجل إيراد جديد.</p>
    <div className="mc-journal-ui__flow">دفتر اليومية <ArrowLeft /> دفتر الأستاذ</div>
  </div>;
}

function LedgerPreview() {
  return <div className="mc-ledger-ui" aria-label="نموذج دفتر أستاذ حساب البنك">
    <header><span><Landmark /> دفتر الأستاذ · سيناريو أوسع</span><small>1010 · حساب البنك</small></header>
    <div className="mc-ledger-ui__line"><span>رصيد أول المدة</span><b dir="ltr">{money(openingBankBalance)}</b></div>
    {demoTransactions.map(item => <div className="mc-ledger-ui__line" key={item.date}><span>{item.description}</span><b dir="ltr">{item.credit ? "+" : "−"}{money(item.credit || item.debit)}</b></div>)}
    <footer><span>رصيد آخر المدة</span><strong dir="ltr">{money(closingBankBalance)} EGP</strong></footer>
  </div>;
}

function TrialBalancePreview() {
  return <div className="mc-trial-ui" aria-label="ميزان مراجعة توضيحي متوازن">
    <header><span><Scale /> ميزان المراجعة</span><small>30/06/2026 · بيانات افتراضية</small></header>
    <table><thead><tr><th>الكود</th><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{trialBalance.map(item => <tr key={item.code}><td dir="ltr">{item.code}</td><td>{item.account}</td><td dir="ltr">{item.debit ? money(item.debit) : "—"}</td><td dir="ltr">{item.credit ? money(item.credit) : "—"}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>الإجمالي</th><th dir="ltr">{money(trialDebitTotal)}</th><th dir="ltr">{money(trialCreditTotal)}</th></tr></tfoot></table>
    <div className="mc-trial-ui__mobile">{trialBalance.map(item => <div key={item.code}><span dir="ltr">{item.code}</span><strong>{item.account}</strong><b dir="ltr">{money(item.debit || item.credit)} <small>{item.debit ? "مدين" : "دائن"}</small></b></div>)}</div>
    <p><Check /> المدين والدائن متساويان في المثال</p>
  </div>;
}

function ReportCard({ title, lines, total, foot }: { title: string; lines: readonly (readonly [string, string])[]; total: readonly [string, string]; foot: string }) {
  return <article className="mc-report"><header><FileText /><h4>{title}</h4></header><div className="mc-report__lines">{lines.map(([label, value]) => <div key={label}><span>{label}</span><b dir="ltr">{value}</b></div>)}</div><div className="mc-report__total"><strong>{total[0]}</strong><b dir="ltr">{total[1]}</b></div><small>{foot}</small></article>;
}

const journeyStages = [
  { title: "كشف البنك", heading: "ابدأ من كشف حساب بنكي", copy: "معاينة لكشف افتراضي يعرض كل حركة ورصيدها.", visual: <StatementPreview /> },
  { title: "Excel", heading: "استخرج الحركات في Excel", copy: "تصوّر لتحويل المستند إلى صفوف منظمة قابلة للفحص.", visual: <><div className="mc-journey__conversion"><span>PDF</span><ArrowLeft /><span>حركات منظمة</span><ArrowLeft /><span>Excel</span></div><ExcelPreview /></> },
  { title: "المراجعة", heading: "راجع البيانات قبل الترحيل", copy: "طابق الأعمدة والأرصدة والتكرار. الاعتماد اليدوي يسبق أي قيد نهائي.", visual: <ReviewPreview /> },
  { title: "القيود", heading: "حوّل الحركات إلى قيود محاسبية", copy: "تحصيل 10,000 جنيه من عميل: البنك مدين والعملاء دائن، دون ترحيل آلي حاليًا.", visual: <JournalPreview /> },
  { title: "الأستاذ والميزان", heading: "راجع الأرصدة وميزان المراجعة", copy: "تابع أثر الحركات على الحسابات وتساوي جانبي ميزان المراجعة في المثال.", visual: <div className="mc-journey__ledger-grid"><LedgerPreview /><TrialBalancePreview /></div> },
  { title: "القوائم", heading: "افهم نتائج شركتك", copy: "القوائم المتكاملة تصور مستقبلي يساعد على فهم الأرقام واتخاذ القرار.", visual: <>
    <div className="mc-journey__report-grid">
      <ReportCard title="قائمة الدخل" lines={[["إيراد الخدمات", money(incomeStatement.revenue)], ["المصروفات", `(${money(incomeStatement.expenses)})`]]} total={["صافي الربح", `${money(incomeStatement.profit)} EGP`]} foot="6,000 − 4,000 = 2,000" />
      <ReportCard title="قائمة المركز المالي" lines={[["الأصول", money(financialPosition.assets)], ["الالتزامات", money(financialPosition.liabilities)], ["حقوق الملكية", money(financialPosition.equity)]]} total={["الأصول = الالتزامات + الحقوق", `${money(financialPosition.assets)} EGP`]} foot="50,000 رأس مال + 2,000 ربح" />
      <ReportCard title="قائمة التدفقات النقدية" lines={[["رصيد أول المدة", money(openingBankBalance)], ["التدفقات الداخلة", money(totalCredits)], ["التدفقات الخارجة", `(${money(totalDebits)})`]]} total={["رصيد آخر المدة", `${money(closingBankBalance)} EGP`]} foot="20,000 + 16,000 − 4,000" />
    </div><p className="mc-journey__conclusion">من بيانات متفرقة إلى صورة مالية أوضح. <span>القوائم المعروضة ليست تقارير حية.</span></p>
  </> },
] as const;

export function AccountingJourney() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowLeft" ? index + 1 : event.key === "ArrowRight" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? journeyStages.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + journeyStages.length) % journeyStages.length;
    setSelected(target);
    tabRefs.current[target]?.focus();
  }

  return <section className="mc-journey af-section" id="journey" aria-labelledby="mc-journey-title">
    <div className="af-container">
      <div className="mc-journey__intro"><span className="mc-vision-label">تصوّر مراحل المحاسبة القادمة · غير مفعّل في الموقع الحالي</span><h2 id="mc-journey-title">رحلة بياناتك المحاسبية</h2><p>اختر مرحلة لترى مثالًا مفصلًا لكيفية انتقال البيانات من كشف البنك إلى القوائم.</p><small>واجهة استكشافية ببيانات افتراضية، دون معالجة أو ترحيل أو اعتماد فعلي.</small></div>
      <div className="mc-journey__experience">
        <div className="mc-journey__tabs" role="tablist" aria-label="مراحل رحلة البيانات المالية">
          {journeyStages.map((stage, index) => <button key={stage.title} ref={element => { tabRefs.current[index] = element; }} id={`mc-journey-tab-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls={`mc-journey-panel-${index}`} tabIndex={selected === index ? 0 : -1} className={selected === index ? "is-active" : ""} onClick={() => setSelected(index)} onKeyDown={event => handleKeys(event, index)}><span className="mc-journey__tab-number">{String(index + 1).padStart(2, "0")}</span><strong>{stage.title}</strong></button>)}
        </div>
        <div className="mc-journey__panels">
          {journeyStages.map((stage, index) => <article key={stage.title} id={`mc-journey-panel-${index}`} className={`mc-journey__panel ${selected === index ? "is-active" : ""}`} role="tabpanel" aria-labelledby={`mc-journey-tab-${index}`} hidden={selected !== index} tabIndex={selected === index ? 0 : -1}><div className="mc-journey__panel-copy"><StageTitle number={index + 1} title={stage.heading} description={stage.copy} /><span>تصور واجهة · بيانات افتراضية</span></div><div className={`mc-journey__panel-visual mc-journey__panel-visual--${index + 1}`}>{stage.visual}</div></article>)}
        </div>
        <div className="mc-journey__trace" aria-live="polite"><div><span className="mc-section-kicker">اتبع حركة واحدة</span><h3>شوف حركة واحدة بتوصل لفين</h3><p>تحصيل مستحق من عميل بقيمة <b dir="ltr">{money(demoTransactions[0].credit)} EGP</b> · مرجع <b dir="ltr">{demoTransactions[0].reference}</b></p></div><div className="mc-journey__trace-detail"><strong>{journeyStages[selected].title}</strong><p>{[
          "تظهر الحركة في كشف البنك كإيداع؛ يزيد الرصيد من 20,000 إلى 30,000 جنيه.",
          "يظهر المرجع والتاريخ والمبلغ في صف منظم للمراجعة. هذا تمثيل، وليس استخراجًا فعليًا.",
          "وُصفت الحركة بأنها مطابقة في المثال؛ يلزم فحص المستند واعتماد بشري قبل أي ترحيل.",
          "القيد المقترح: 10,000 مدين بنك و10,000 دائن عملاء. تحصيل الذمة ليس إيرادًا جديدًا.",
          "بعد اعتماد قيد افتراضي، يزيد البنك وتنخفض ذمم العملاء بالمبلغ نفسه. الميزان المعروض يمثل سيناريو أوسع.",
          "تؤثر الحركة في أرصدة البنك والعملاء والتدفقات النقدية بعد اعتمادها؛ القوائم المعروضة تشمل حركات افتراضية أخرى.",
        ][selected]}</p></div></div>
      </div>
    </div>
  </section>;
}
