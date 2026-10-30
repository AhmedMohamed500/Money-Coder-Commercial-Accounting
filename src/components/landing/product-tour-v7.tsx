"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Check, FileSpreadsheet, FileText, Landmark, LockKeyhole, ScanSearch, Users } from "lucide-react";
import { customerCollectionEntry, demoTransactions, money } from "./accounting-demo-data";

const steps = [
  { title: "تنظيم الشركة", status: "متاح الآن", copy: "ابدأ بملف الشركة، الحسابات البنكية المسجلة، وأدوار من يعملون عليها." },
  { title: "مراجعة كشف البنك", status: "معاينة مستقبلية", copy: "تصور لسير عمل يبدأ بملف PDF وينتهي بمسودة حركات تحتاج مراجعة واعتمادًا بشريًا." },
  { title: "تتبّع حركة مالية", status: "معاينة مستقبلية", copy: "مثال محاسبي لتحصيل عميل: زيادة البنك وخفض ذمة العميل، دون احتساب إيراد جديد." },
] as const;

export function ProductTourV7() {
  const [active, setActive] = useState(0);
  return <section className="v7-tour v7-section" id="tour" aria-labelledby="v7-tour-title" data-v7-reveal><div className="v7-shell"><div className="v7-section-head"><div><span className="v7-kicker">جولة داخل الفكرة</span><h2 id="v7-tour-title">من التنظيم إلى قرار محاسبي مفهوم.</h2></div><p>تجربة تفاعلية توضّح ما يعمل اليوم وما هو تصور للمرحلة القادمة. كل الأرقام في المشاهد افتراضية.</p></div><div className="v7-tour__layout"><div className="v7-tour__steps" aria-label="سيناريوهات جولة المنتج">{steps.map((item, index) => <button type="button" key={item.title} className={active === index ? "is-active" : ""} aria-pressed={active === index} onClick={() => setActive(index)}><b>0{index + 1}</b><span><small>{item.status}</small><strong>{item.title}</strong><em>{item.copy}</em></span><ArrowLeft aria-hidden="true" /></button>)}</div><div className="v7-tour__stage" aria-live="polite" key={active}><div className="v7-tour__stage-head"><span className={`v7-demo-tag ${active === 0 ? "is-current" : ""}`}>{steps[active].status} · بيانات توضيحية</span><strong>{steps[active].title}</strong></div>
      {active === 0 && <div className="v7-tour__company"><div className="v7-tour__company-head"><Building2 /><span><small>شركة المثال التجارية</small><strong>مساحة عمل واحدة</strong></span><b>ملف منظم</b></div><div className="v7-tour__company-grid"><span><Building2 />ملف الشركة<Check /></span><span><Landmark />حسابات مسجلة<Check /></span><span><Users />أعضاء الفريق<Check /></span><span><LockKeyhole />تفويض بموافقة<Check /></span></div><p>الرصيد والتحليلات المالية لا تظهر هنا كبيانات حية.</p></div>}
      {active === 1 && <div className="v7-tour__bank"><div className="v7-tour__flow"><span><FileText /> كشف PDF</span><ArrowLeft /><span><ScanSearch /> استخراج مقترح</span><ArrowLeft /><span><Check /> مراجعة بشرية</span><ArrowLeft /><span><FileSpreadsheet /> مخرجات منظمة</span></div><strong>مسودة حركات افتراضية للمراجعة</strong><div className="v7-tour__table"><div><b>التاريخ</b><b>الحركة</b><b>المبلغ</b><b>الحالة</b></div>{demoTransactions.map(item => <div key={item.reference}><span>{item.date}</span><span>{item.description}</span><strong>{money(item.credit || item.debit)} ج.م</strong><em className={item.review === "مطابق" ? "is-clear" : ""}>{item.review}</em></div>)}</div><p>هذا المسار تصور للمنتج القادم؛ لا تُستخرج ملفات أو تُعتمد حركات من هذه الصفحة.</p></div>}
      {active === 2 && <div className="v7-tour__trace"><div className="v7-tour__trace-top"><span>تحصيل من عميل · {customerCollectionEntry.reference}</span><strong>+{money(customerCollectionEntry.bankDebit)} ج.م</strong></div><div className="v7-tour__journal"><div><small>مدين</small><strong>حساب البنك</strong><b>{money(customerCollectionEntry.bankDebit)} ج.م</b></div><div><small>دائن</small><strong>حساب العملاء</strong><b>{money(customerCollectionEntry.receivablesCredit)} ج.م</b></div></div><div className="v7-tour__trace-note"><Check /> التحصيل يسوّي ذمة قائمة. لا يُنشئ إيرادًا جديدًا.</div><p>قيد تعليمي متوازن بمبلغ مدين يساوي الدائن؛ لا يوجد ترحيل فعلي.</p></div>}
    </div></div></div></section>;
}
