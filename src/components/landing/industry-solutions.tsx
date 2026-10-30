"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, Check, Factory, Landmark } from "lucide-react";

const audiences = [
  {
    label: "مكاتب المحاسبة", icon: Landmark, image: "/landing/finance-team-review-v4.webp", alt: "فريق محاسبي يناقش نتائج مالية في مكتب", heading: "مساحة أوضح للمكتب وعملائه",
    points: ["عضويات وأدوار محددة", "تفويض من الشركة قبل الوصول", "ملفات العملاء حسب الصلاحية"],
    description: "يمكن للمكتب إدارة فريقه وطلب تفويض من الشركات؛ لا يحصل أي موظف على وصول خارج حدود دوره والتفويض المقبول.",
    availability: "ملف المكتب والصلاحيات متاحان؛ المراجعة المحاسبية المتقدمة قيد التطوير.", href: "#roles",
  },
  {
    label: "الشركات التجارية", icon: Building2, image: "/landing/commercial-warehouse-v5.webp", alt: "عاملان يراجعان بضائع في مخزن شركة تجارية", heading: "بيانات شركتك في مكان واحد",
    points: ["ملف الشركة والحسابات البنكية", "أعضاء الفريق والصلاحيات", "المستندات بحسب جاهزية الخدمة"],
    description: "ابدأ بملف موحد للشركة وحساباتها وفريقها. تظهر رحلة الحركة المحاسبية في الصفحة بوصفها تصورًا للمراحل القادمة.",
    availability: "تأسيس الشركة والحسابات والعضويات متاح؛ المحرك المحاسبي قيد التطوير.", href: "#features",
  },
  {
    label: "المصانع والشركات الصناعية", icon: Factory, image: "/landing/factory-cutaway-v2.webp", alt: "تصور لمخزن خامات وخط إنتاج ومنطقة شحن بمصنع", heading: "افهم مسار تكلفة الإنتاج",
    points: ["فصل الخامات والأجور عن المصروفات", "مثال واضح لتكوين التكلفة", "رؤية مستقبلية لتقارير المصنع"],
    description: "المثال الصناعي يشرح الفرق بين تكلفة التصنيع ومصروفات الفترة، مع اختيار بصري لمكونات التكلفة.",
    availability: "حالة استخدام توضيحية؛ وحدة تصنيع وتكاليف المصانع غير مفعّلة.", href: "#factory",
  },
] as const;

export function IndustrySolutions() {
  const [selected, setSelected] = useState(1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowLeft" ? index + 1 : event.key === "ArrowRight" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? audiences.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + audiences.length) % audiences.length;
    setSelected(target);
    refs.current[target]?.focus();
  }

  const active = audiences[selected];

  return <section className="mc-approved-solutions af-section" id="solutions" aria-labelledby="mc-solutions-title">
    <div className="af-container">
      <div className="mc-approved-heading"><span className="mc-section-kicker">قطاعات مختلفة · أساس واحد</span><h2 id="mc-solutions-title">حلول مصممة حسب طبيعة نشاطك</h2><p>شركات تجارية ومكاتب محاسبة ومصانع؛ تصف كل بطاقة ما هو متاح وما يزال ضمن الرؤية.</p></div>
      <div className="mc-approved-solutions__grid" role="tablist" aria-label="اختر نوع النشاط">
        {audiences.map((audience, index) => <article className={`mc-approved-sector ${selected === index ? "is-active" : ""}`} key={audience.label}>
          <div className="mc-approved-sector__image"><Image src={audience.image} fill sizes="(max-width: 700px) 100vw, (max-width: 1050px) 48vw, 31vw" alt={audience.alt} loading="lazy" /></div>
          <div className="mc-approved-sector__content"><span className="mc-approved-sector__icon"><audience.icon aria-hidden="true" /></span><h3>{audience.label}</h3><ul>{audience.points.map(point => <li key={point}><Check aria-hidden="true" />{point}</li>)}</ul>
            <button ref={element => { refs.current[index] = element; }} id={`mc-sector-tab-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls="mc-sector-detail" tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => onKeys(event, index)}>استكشف {audience.label} <ArrowLeft aria-hidden="true" /></button>
          </div>
        </article>)}
      </div>
      <div className="mc-approved-solutions__detail" id="mc-sector-detail" role="tabpanel" aria-labelledby={`mc-sector-tab-${selected}`} tabIndex={0}>
        <div><strong>{active.heading}</strong><p>{active.description}</p><small>{active.availability}</small></div>
        <Link href={active.href}>شاهد القسم المرتبط <ArrowLeft aria-hidden="true" /></Link>
      </div>
    </div>
  </section>;
}
