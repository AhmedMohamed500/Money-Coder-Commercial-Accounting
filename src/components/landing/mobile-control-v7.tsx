"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Check, Landmark, LockKeyhole, Smartphone, Users } from "lucide-react";
import { closingBankBalance, demoTransactions, money } from "./accounting-demo-data";

const views = [
  { id: "company", label: "الشركة", title: "ملف الشركة في متناولك", description: "بيانات الكيان، الحسابات المسجلة، والفريق في مساحة واحدة.", status: "متاح الآن", icon: Building2 },
  { id: "pulse", label: "النبض المالي", title: "صورة مالية سريعة", description: "تصور مستقبلي لمؤشرات تستند إلى بيانات تم مراجعتها واعتمادها.", status: "معاينة مستقبلية", icon: Landmark },
  { id: "actions", label: "عمل المحاسب", title: "ما الذي يحتاج إلى مراجعة؟", description: "مثال لفرز الحركات التي تحتاج مستندًا أو مراجعة بشرية.", status: "معاينة مستقبلية", icon: Check },
  { id: "insights", label: "رؤية الإدارة", title: "القرار يبدأ من سياق واضح", description: "تصور مستقبلي لتقرير مبسط عن التحصيل والمصروفات.", status: "معاينة مستقبلية", icon: Smartphone },
  { id: "access", label: "الصلاحيات", title: "الفريق يرى ما يخصه", description: "أدوار الأعضاء والتفويض المقبول تحدد الوصول إلى الشركة.", status: "متاح الآن", icon: LockKeyhole },
] as const;

function useTabs() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowLeft") next = (index + 1) % views.length;
    else if (event.key === "ArrowRight") next = (index - 1 + views.length) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault(); setActive(next); refs.current[next]?.focus();
  }
  return { active, setActive, refs, onKeyDown };
}

function Screen({ view }: { view: number }) {
  return <div className="v7-phone__body" id="v7-phone-panel" role="tabpanel" aria-labelledby={`v7-phone-tab-${view}`}>
    <div className="v7-phone__hello"><span>صباح الخير، أحمد</span><strong>{views[view].title}</strong></div>
    <span className={`v7-demo-tag ${view === 0 || view === 4 ? "is-current" : ""}`}>{views[view].status} · بيانات توضيحية</span>
    {view === 0 && <div className="v7-phone__content"><div className="v7-phone__hero-card"><small>شركة المثال التجارية</small><strong>ملف الشركة</strong><span>معلومات الكيان وفريق العمل</span></div><div className="v7-phone__mini-grid"><span><Building2 />بيانات الشركة</span><span><Landmark />الحسابات المسجلة</span><span><Users />أعضاء الفريق</span><span><LockKeyhole />التفويضات</span></div></div>}
    {view === 1 && <div className="v7-phone__content"><div className="v7-phone__hero-card"><small>رصيد كشف افتراضي · غير مباشر</small><strong>{money(closingBankBalance)} <i>ج.م</i></strong><span>مثال تعليمي من 4 حركات</span></div><div className="v7-phone__metric"><span>تحصيل العميل</span><strong>+{money(demoTransactions[0].credit)} ج.م</strong></div><div className="v7-phone__metric"><span>مصروفات الفترة</span><strong>−{money(4_000)} ج.م</strong></div></div>}
    {view === 2 && <div className="v7-phone__content"><div className="v7-phone__hero-card"><small>مسودة مراجعة مستقبلية</small><strong>حركتان تحتاجان قرارًا</strong><span>الاعتماد يظل بيد المحاسب</span></div><div className="v7-phone__task"><b>١</b><span>مصروف تشغيل<br /><small>المستند غير محدد</small></span><em>للمراجعة</em></div><div className="v7-phone__task"><b>٢</b><span>إيراد خدمة<br /><small>تحقق من التكرار</small></span><em>تحقق</em></div></div>}
    {view === 3 && <div className="v7-phone__content"><div className="v7-phone__hero-card"><small>تقرير افتراضي غير حي</small><strong>من الحركة إلى الرؤية</strong><span>بعد المراجعة والاعتماد فقط</span></div><div className="v7-phone__bars"><span style={{ height: "43%" }} /><span style={{ height: "68%" }} /><span style={{ height: "53%" }} /><span style={{ height: "84%" }} /><span style={{ height: "72%" }} /></div><div className="v7-phone__metric"><span>صافي ربح المثال</span><strong>{money(2_000)} ج.م</strong></div></div>}
    {view === 4 && <div className="v7-phone__content"><div className="v7-phone__hero-card"><small>شركة المثال التجارية</small><strong>وصول واضح</strong><span>حسب العضوية والتفويض</span></div><div className="v7-phone__person"><Users /><span>صاحب الشركة<small>إدارة الشركة وأعضائها</small></span><Check /></div><div className="v7-phone__person"><Users /><span>عضو الفريق<small>صلاحياته حسب الدور</small></span><Check /></div><div className="v7-phone__person"><LockKeyhole /><span>مكتب المحاسبة<small>بعد قبول التفويض</small></span><Check /></div></div>}
    <div className="v7-phone__bottom"><span>الرئيسية</span><span>الشركة</span><span>الفريق</span><span>الحساب</span></div>
  </div>;
}

export function HeroDevice() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setStep(1), 2200);
    return () => window.clearTimeout(id);
  }, []);
  return <div className="v7-hero-device" aria-label="معاينة توضيحية للشركة والصلاحيات على الكمبيوتر والهاتف">
    <div className="v7-hero-device__desk"><div className="v7-browser"><div className="v7-browser__bar"><i /><i /><i /><span>Money Coder / مساحة العمل</span></div><div className="v7-browser__app"><aside><strong>MC</strong><span>الرئيسية</span><span>الشركة</span><span>الحسابات</span><span>الفريق</span><span>التفويض</span></aside><div className="v7-browser__main"><div className="v7-browser__top"><small>مساحة العمل · عرض توضيحي</small><strong>شركة المثال التجارية</strong></div><div className="v7-browser__welcome"><span>مرحبًا، أحمد</span><strong>نظرة منظمة على شركتك</strong><small>ملف الشركة وحساباتها المسجلة وفريق العمل</small></div><div className="v7-browser__cards"><span><Building2 />ملف الشركة<strong>منظم</strong></span><span><Landmark />الحسابات<strong>مسجلة</strong></span><span><Users />الفريق<strong>حسب الدور</strong></span></div><div className="v7-browser__list"><strong>{step ? "الصلاحيات والتفويض" : "خطوات تنظيم الشركة"}</strong><p><Check />{step ? "صاحب الشركة يدير الوصول" : "أضف بيانات شركتك"}</p><p><Check />{step ? "الأعضاء حسب صلاحياتهم" : "سجّل حسابات البنك"}</p><p><Check />{step ? "المكتب بعد قبول التفويض" : "حدّد أدوار الفريق"}</p></div></div></div></div></div>
    <div className="v7-hero-device__phone"><div className="v7-hero-device__notch" /><small>Money Coder</small><strong>{step ? "وصول الفريق" : "شركتي اليوم"}</strong><div><span>{step ? "تفويض المكتب" : "ملف الشركة"}</span><b>{step ? "بانتظار الموافقة" : "منظم"}</b></div><div><span>{step ? "أعضاء الفريق" : "الحسابات المسجلة"}</span><b>{step ? "حسب الدور" : "٢ حسابات"}</b></div><div className="v7-hero-device__graph" aria-hidden="true"><i /><i /><i /><i /><i /></div><small>معاينة توضيحية · ليست بيانات حية</small></div>
    <div className="v7-hero-device__float"><Check /> الملف والفريق في مساحة واحدة</div>
  </div>;
}

export function MobileControlExperience({ startHref }: { startHref: string }) {
  const { active, setActive, refs, onKeyDown } = useTabs();
  return <section className="v7-mobile v7-section" id="mobile-control" aria-labelledby="v7-mobile-title" data-v7-reveal><div className="v7-shell"><div className="v7-section-head"><div><span className="v7-kicker">مساحة عملك معك</span><h2 id="v7-mobile-title">اعرف أين تقف، أينما كنت.</h2></div><p>خمسة مشاهد تفرّق بوضوح بين تنظيم شركتك المتاح الآن والرؤية المالية التي نعمل عليها.</p></div><div className="v7-mobile__layout"><div className="v7-mobile__copy"><div className="v7-tabs" role="tablist" aria-label="مشاهد متابعة الموبايل">{views.map((view, index) => { const Icon = view.icon; return <button key={view.id} id={`v7-phone-tab-${index}`} role="tab" aria-controls="v7-phone-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} ref={node => { refs.current[index] = node; }} onClick={() => setActive(index)} onKeyDown={event => onKeyDown(event, index)}><Icon aria-hidden="true" /><span>{view.label}</span></button>; })}</div><div className="v7-mobile__story" key={active}><span className={`v7-demo-tag ${views[active].status === "متاح الآن" ? "is-current" : ""}`}>{views[active].status}</span><h3>{views[active].title}</h3><p>{views[active].description}</p><Link href={startHref}>ابدأ بتنظيم شركتك <ArrowLeft aria-hidden="true" /></Link></div></div><div className="v7-mobile__stage"><div className="v7-phone"><div className="v7-phone__notch" /><div className="v7-phone__top"><span>9:41</span><span>◖ ● ▰</span></div><div className="v7-phone__brand">Money Coder <span>MC</span></div><Screen view={active} /></div><div className="v7-mobile__annotation">معاينة واجهة · أرقام الأمثلة افتراضية</div></div></div></div></section>;
}
