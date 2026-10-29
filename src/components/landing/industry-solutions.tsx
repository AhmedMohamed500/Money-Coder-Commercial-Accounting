"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Building2, Factory, FileText, Landmark, Scale, ShieldCheck, Users } from "lucide-react";
import { IndustrialCutaway } from "./factory-cutaway";
import { factoryProductionCost, money } from "./accounting-demo-data";

const audiences = [
  { label: "الشركات التجارية", icon: Building2, heading: "كل شركة ومسؤولياتها في مساحة واضحة", description: "نظّم بيانات الشركة وحساباتها البنكية وأعضاء فريقها، ثم وسّع رحلتها المحاسبية مع المراحل القادمة.", points: ["بيانات الشركة والحسابات البنكية", "فريق وصلاحيات بحسب الدور", "المستندات وفق جاهزية الرفع"], availability: "الأساس المؤسسي متاح؛ الحركة المحاسبية تصور مستقبلي." },
  { label: "المصانع", icon: Factory, heading: "افصل تكلفة الإنتاج عن مصروفات الفترة", description: "المصنع يحتاج رؤية للخامات والأجور الصناعية والتكاليف غير المباشرة قبل الحكم على هامش الربح.", points: ["خامات وأجور وتكاليف صناعية", "مراكز تكلفة ومخزون ضمن الرؤية", "ربط التكلفة بنتائج النشاط"], availability: "حالة استخدام مستقبلية؛ لا توجد وحدة تصنيع أو تكاليف مفعّلة." },
  { label: "الإدارة المالية", icon: Users, heading: "مراجعة منظمة لفريق يعرف صلاحياته", description: "اجمع بيانات المؤسسة ودور كل عضو في مكان واحد، مع تصور لطابور مراجعة الحسابات والتقارير.", points: ["عضويات وأدوار محددة", "إحالات مستندات الشركة", "مراجعة القيود والقوائم في المراحل القادمة"], availability: "صلاحيات الفريق متاحة؛ شاشة المراجعة المحاسبية تصور مستقبلي." },
] as const;

function CommercialVisual() {
  return <div className="mc-audience-ui" aria-label="واجهة توضيحية لشركة تجارية"><header><Building2 /><span><strong>شركة المثال التجارية</strong><small>مساحة المؤسسة</small></span><em>مثال توضيحي</em></header><div className="mc-audience-ui__cards"><div><small>حسابات بنكية</small><strong>02</strong><Landmark /></div><div><small>أعضاء الفريق</small><strong>05</strong><Users /></div></div><div className="mc-audience-ui__rows"><div><span>ملف الشركة</span><b>منظم</b></div><div><span>مستندات الموردين والعملاء</span><b>حسب جاهزية الخدمة</b></div><div><span>ملخص الحركة المالية</span><b>تصور قادم</b></div></div><div className="mc-audience-ui__documents"><span><FileText /> مستند مورد · مثال</span><span><Landmark /> كشف بنك · مثال</span></div></div>;
}

function FactoryVisual() {
  return <div className="mc-audience-factory" aria-label="تصور لتجميع تكلفة التصنيع"><IndustrialCutaway compact /><div className="mc-audience-factory__total"><Scale /><span>تكلفة إنتاج توضيحية</span><strong dir="ltr">{money(factoryProductionCost)} EGP</strong></div><small>أرقام افتراضية · نظام تكاليف المصانع غير مفعّل</small></div>;
}

function FinanceVisual() {
  return <div className="mc-audience-finance" aria-label="تصور مساحة مراجعة للفريق المالي"><header><ShieldCheck /><span><strong>مساحة الإدارة المالية</strong><small>أدوار واضحة · مثال توضيحي</small></span></header><div className="mc-audience-finance__line"><span><FileText /> مستندات الشركة</span><b>ضمن الصلاحيات</b></div><div className="mc-audience-finance__line"><span><Users /> أعضاء الفريق</span><b>أدوار محددة</b></div><div className="mc-audience-finance__line"><span><Scale /> مراجعة قيود المحاسبة</span><b>رؤية قادمة</b></div><div className="mc-audience-finance__reports"><span><FileText /> قائمة الدخل <small>تصور قادم</small></span><span><ShieldCheck /> صلاحيات الفريق <small>ضمن الأساس الحالي</small></span></div><div className="mc-audience-finance__footer"><span>مالك الشركة</span><span>المحاسب</span><span>المراجع</span></div></div>;
}

const visuals = [<CommercialVisual key="commercial" />, <FactoryVisual key="factory" />, <FinanceVisual key="finance" />];

export function IndustrySolutions() {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowLeft" ? index + 1 : event.key === "ArrowRight" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? audiences.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + audiences.length) % audiences.length;
    setSelected(target);
    refs.current[target]?.focus();
  }

  return <section className="mc-solutions af-section" id="solutions" aria-labelledby="mc-solutions-title"><div className="af-container"><div className="af-heading"><i /><h2 id="mc-solutions-title">حلول مالية تناسب طبيعة شغلك</h2><p>سواء بتدير شركة تجارية أو مصنع أو فريق مالي، الأهم إن بياناتك تبقى منظمة وسهلة المتابعة.</p></div><div className="mc-solutions__tabs" role="tablist" aria-label="اختر طبيعة النشاط">{audiences.map((audience, index) => <button key={audience.label} ref={element => { refs.current[index] = element; }} id={`mc-solution-tab-${index}`} type="button" role="tab" aria-controls={`mc-solution-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => onKeys(event, index)}><audience.icon />{audience.label}</button>)}</div>{audiences.map((audience, index) => <div key={audience.label} id={`mc-solution-panel-${index}`} role="tabpanel" aria-labelledby={`mc-solution-tab-${index}`} className="mc-solutions__panel" hidden={selected !== index} tabIndex={0}><div className="mc-solutions__copy"><span className="mc-section-kicker">{audience.label}</span><h3>{audience.heading}</h3><p>{audience.description}</p><ul>{audience.points.map(point => <li key={point}><span />{point}</li>)}</ul><small>{audience.availability}</small></div><div className="mc-solutions__visual">{visuals[index]}</div></div>)}</div></section>;
}
