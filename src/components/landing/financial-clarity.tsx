"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, CircleX, FileSpreadsheet, FolderCheck, ShieldCheck } from "lucide-react";

export function FinancialClarity() {
  const [view, setView] = useState<"before" | "after">("after");

  return <section className="mc-approved-clarity af-section" id="clarity" aria-labelledby="mc-clarity-title">
    <div className="af-container">
      <div className="mc-approved-heading">
        <span className="mc-section-kicker">من المستند إلى رؤية أوضح</span>
        <h2 id="mc-clarity-title">من فوضى البيانات إلى وضوح القرار</h2>
        <p>ملف الشركة وصلاحيات الفريق أساس منظم اليوم؛ مراجعة الحركات والتقارير المعروضة هنا تصور لما نطوره لاحقًا.</p>
      </div>
      <div className="mc-approved-clarity__switch" role="group" aria-label="اختر مشهد المقارنة">
        <button type="button" aria-pressed={view === "before"} onClick={() => setView("before")}>قبل التنظيم</button>
        <button type="button" aria-pressed={view === "after"} onClick={() => setView("after")}>بعد التنظيم</button>
      </div>
      <div className={`mc-approved-compare is-${view}`}>
        <article className="mc-approved-compare__card mc-approved-compare__card--before">
          <Image src="/landing/before-paperwork-v5.webp" fill sizes="(max-width: 780px) 100vw, 48vw" alt="مكتب عليه كشوف وأوراق كثيرة قبل تنظيمها" loading="lazy" />
          <span className="mc-approved-compare__badge">قبل</span>
          <div className="mc-approved-compare__overlay">
            <strong>بيانات موزعة بين ملفات</strong>
            <span><CircleX aria-hidden="true" /> بحث يدوي متكرر</span>
            <span><CircleX aria-hidden="true" /> نسخ متعددة يصعب تتبعها</span>
            <span><CircleX aria-hidden="true" /> صورة مالية غير مكتملة</span>
          </div>
        </article>
        <span className="mc-approved-compare__arrow" aria-hidden="true"><ArrowLeft /></span>
        <article className="mc-approved-compare__card mc-approved-compare__card--after">
          <Image src="/landing/hero-office-v3.webp" fill sizes="(max-width: 780px) 100vw, 48vw" alt="مكتب حديث يعرض تصورًا لتنظيم بيانات الشركة" loading="lazy" />
          <span className="mc-approved-compare__badge">بعد</span>
          <div className="mc-approved-compare__screen" aria-label="معاينة توضيحية لواجهة بيانات مالية افتراضية">
            <div className="mc-approved-compare__screen-top"><b>Money Coder</b><span>نظرة مالية · بيانات افتراضية</span></div>
            <div className="mc-approved-compare__screen-metrics"><span><small>رصيد البنك</small><strong>32,000</strong></span><span><small>حركات الكشف</small><strong>4</strong></span><span><small>للمراجعة</small><strong>1</strong></span></div>
            <div className="mc-approved-compare__screen-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="mc-approved-compare__screen-foot"><span>مراجعة الحركات</span><span>تقرير توضيحي</span></div>
          </div>
          <div className="mc-approved-compare__product" aria-label="واجهة توضيحية لتنظيم بيانات الشركة">
            <header><FolderCheck aria-hidden="true" /><span><b>شركة المثال التجارية</b><small>مساحة عمل توضيحية</small></span><ShieldCheck aria-hidden="true" /></header>
            <div><span>ملف الشركة</span><strong><Check aria-hidden="true" /> منظم</strong></div>
            <div><span>صلاحيات الفريق</span><strong><Check aria-hidden="true" /> محددة</strong></div>
            <div><span>مراجعة الحركات</span><strong className="is-future"><FileSpreadsheet aria-hidden="true" /> قيد التطوير</strong></div>
          </div>
        </article>
      </div>
      <p className="mc-approved-clarity__caption" aria-live="polite">{view === "before" ? "المشهد الأول يوضح صعوبة مراجعة الملفات المتفرقة يدويًا." : "المشهد الثاني يوضح تنظيم البيانات الحالي مع تصور للمراجعة المالية القادمة."}</p>
    </div>
  </section>;
}
