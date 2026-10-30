import Image from "next/image";
import { ArrowLeft, Check, CircleX, FolderCheck, ShieldCheck } from "lucide-react";

export function FinancialClarity() {
  return <section className="mc-approved-clarity af-section" id="clarity" aria-labelledby="mc-clarity-title"><div className="af-container">
    <div className="mc-approved-heading"><span className="mc-section-kicker">من ملفات متفرقة إلى مساحة مشتركة</span><h2 id="mc-clarity-title">من فوضى البيانات إلى وضوح القرار</h2><p>تنظيم الشركة والصلاحيات خطوة متاحة اليوم. مراجعة الحركات والقوائم المحاسبية المعروضة لاحقًا أمثلة لما نطوره.</p></div>
    <div className="mc-approved-compare"><article className="mc-approved-compare__card mc-approved-compare__card--before"><Image src="/landing/before-paperwork-v5.webp" fill sizes="(max-width: 780px) 100vw, 48vw" alt="مشهد تمثيلي لمكتب عليه أوراق وملفات متفرقة" loading="lazy" /><span className="mc-approved-compare__badge">قبل التنظيم</span><div className="mc-approved-compare__overlay"><strong>المعلومة في أكثر من مكان</strong><span><CircleX /> بحث يدوي بين الملفات</span><span><CircleX /> نسخ يصعب توحيدها</span><span><CircleX /> مسؤوليات غير واضحة</span></div></article>
      <span className="mc-approved-compare__arrow" aria-hidden="true"><ArrowLeft /></span>
      <article className="mc-approved-compare__card mc-approved-compare__card--after"><Image src="/landing/hero-office-v3.webp" fill sizes="(max-width: 780px) 100vw, 48vw" alt="مشهد تمثيلي لمساحة عمل منظمة" loading="lazy" /><span className="mc-approved-compare__badge">بعد التنظيم</span><div className="mc-approved-compare__product" aria-label="ملخص توضيحي لأساس الشركة المتاح"><header><FolderCheck /><span><b>شركة المثال التجارية</b><small>ملف شركة افتراضية</small></span><ShieldCheck /></header><div><span>ملف الشركة</span><strong><Check /> منظم</strong></div><div><span>الحسابات البنكية</span><strong><Check /> مسجلة</strong></div><div><span>صلاحيات الفريق</span><strong><Check /> محددة</strong></div></div></article>
    </div>
  </div></section>;
}
