"use client";

import { useState } from "react";
import { ArrowLeft, CircleAlert, FileSpreadsheet, FileText, FolderCheck, ReceiptText, ScanLine } from "lucide-react";

export function FinancialClarity() {
  const [view, setView] = useState<"before" | "after">("after");

  return <section className="mc-clarity af-section" id="clarity" aria-labelledby="mc-clarity-title">
    <div className="af-container">
      <div className="mc-clarity__heading"><div><span className="mc-section-kicker">من المعاملة إلى القرار</span><h2 id="mc-clarity-title">من فوضى الحسابات إلى وضوح القرار</h2><p>بدل البيانات المتفرقة والملفات المتعددة، اكتشف طريقة أوضح لتنظيم ومراجعة معلومات شركتك المالية.</p></div><div className="mc-clarity__switch" aria-label="عرض قبل التنظيم أو بعده"><button type="button" aria-pressed={view === "before"} onClick={() => setView("before")}>قبل التنظيم</button><button type="button" aria-pressed={view === "after"} onClick={() => setView("after")}>بعد التنظيم</button></div></div>
      <div className={`mc-clarity__scene ${view === "after" ? "is-after" : "is-before"}`}>
        <div className="mc-clarity__before"><span className="mc-clarity__scene-label">ملفات متفرقة · مثال توضيحي</span><div className="mc-clarity__loose"><article><FileText /><strong>كشف-بنك.pdf</strong><small>حركات بحاجة للفحص</small></article><article><FileSpreadsheet /><strong>حركات-يونيو.xlsx</strong><small>نسخ متعددة</small></article><article><ReceiptText /><strong>فواتير ومرفقات</strong><small>مرجع منفصل</small></article></div><p><CircleAlert /> مراجعة يدوية متكررة وصعوبة في تتبع مصدر كل رقم.</p></div>
        <span className="mc-clarity__arrow" aria-hidden="true"><ArrowLeft /></span>
        <div className="mc-clarity__after"><span className="mc-clarity__scene-label">رؤية منظمة · تصور للمنتج</span><div className="mc-clarity__organized"><div><FolderCheck /><span><b>مستندات الشركة</b><small>في مساحة واضحة</small></span><strong>04</strong></div><div><ScanLine /><span><b>حركات قابلة للمراجعة</b><small>مصدر وحالة لكل حركة</small></span><strong>04</strong></div><div><FileSpreadsheet /><span><b>ملخص مالي مفهوم</b><small>خطوة قادمة بعد المحاسبة</small></span><strong>EGP</strong></div></div><p>تنظيم الشركة والصلاحيات متاحان؛ معالجة الحركات والقوائم المالية جزء من الرؤية القادمة.</p></div>
      </div>
      <p className="mc-clarity__caption" aria-live="polite">{view === "after" ? "المشهد الحالي يبرز شكل البيانات بعد تنظيمها ومراجعتها في التصور المستقبلي." : "المشهد الحالي يبرز مشكلة تشتت الملفات قبل تنظيم بيانات الشركة."}</p>
    </div>
  </section>;
}
