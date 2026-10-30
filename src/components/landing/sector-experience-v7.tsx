"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, Calculator, Factory, FileText, Landmark, Users } from "lucide-react";
import { factoryExample, factoryGrossProfit, factoryOperatingProfit, factoryProductionCost, money } from "./accounting-demo-data";

const sectors = [
  { id: "commercial", title: "الشركات التجارية", tag: "ملف واضح ونشاط منظم", image: "/landing/commercial-warehouse-v5.webp", icon: Building2, current: "ملف الشركة وحساباتها المسجلة وأعضاء الفريق", future: "تصور لمتابعة التحصيل والمصروفات والمخزون" },
  { id: "office", title: "مكاتب المحاسبة", tag: "تعاون يبدأ بموافقة الشركة", image: "/landing/finance-team-review-v4.webp", icon: Calculator, current: "عضوية المكتب وطلب تفويض مقبول من الشركة", future: "تصور لمراجعة الكشوف والقيود وتقارير العملاء" },
  { id: "factory", title: "المصانع", tag: "من عناصر التكلفة إلى الربح", image: "/landing/factory-cutaway-v2.webp", icon: Factory, current: "ملف الشركة والفريق والحسابات المسجلة", future: "مثال تعليمي لتكلفة الإنتاج والقوائم" },
] as const;

export function SectorExperienceV7() {
  const [active, setActive] = useState(0);
  const sector = sectors[active];
  return <section className="v7-sectors v7-section" id="solutions" aria-labelledby="v7-sectors-title" data-v7-reveal><div className="v7-shell"><div className="v7-section-head"><div><span className="v7-kicker">لكل نشاط سياقه</span><h2 id="v7-sectors-title">تجربة تفهم شكل عملك.</h2></div><p>نقطة بداية حقيقية للشركة، مع أمثلة مستقبلية مختلفة لكل قطاع. سيناريو المصنع توضيحي ولم يُفعّل كنظام تكاليف.</p></div><div className="v7-sectors__tabs">{sectors.map((item, index) => { const Icon = item.icon; return <button key={item.id} className={active === index ? "is-active" : ""} aria-pressed={active === index} onClick={() => setActive(index)}><Icon /><span>{item.title}</span></button>; })}</div><div className="v7-sectors__panel" key={sector.id}><div className="v7-sectors__photo"><Image src={sector.image} fill sizes="(max-width: 800px) 100vw, 48vw" alt={sector.title} /><span>{sector.tag}</span></div><div className="v7-sectors__story"><span className="v7-kicker">{sector.title}</span><h3>{sector.tag}</h3><div><small>متاح الآن</small><p>{sector.current}</p></div><div><small>معاينة مستقبلية</small><p>{sector.future}</p></div>{sector.id === "factory" ? <div className="v7-factory"><strong>مثال تكلفة مصنع افتراضي · ج.م</strong><span>مواد خام <b>{money(factoryExample.materials)}</b></span><span>أجور مباشرة <b>{money(factoryExample.labor)}</b></span><span>تكاليف غير مباشرة <b>{money(factoryExample.overhead)}</b></span><span className="is-total">تكلفة الإنتاج <b>{money(factoryProductionCost)}</b></span><span>المبيعات <b>{money(factoryExample.sales)}</b></span><span>مجمل الربح <b>{money(factoryGrossProfit)}</b></span><span className="is-total">ربح التشغيل بعد المصروفات <b>{money(factoryOperatingProfit)}</b></span></div> : <div className="v7-sectors__note"><FileText /> خطوات واضحة من تنظيم البيانات إلى مراجعة بشرية أدق.</div>}</div></div></div></section>;
}

const roles = [
  { title: "صاحب الشركة", image: "/landing/role-owner-v5.webp", copy: "يرى ملف شركته، ينظم الفريق، ويوافق على التفويض أو يرفضه.", current: "متاح الآن", icon: Building2 },
  { title: "المحاسب", image: "/landing/role-accountant-v5.webp", copy: "يعمل من خلال عضوية وصلاحيات محددة، ويصل للشركة بعد قبول التفويض.", current: "متاح الآن", icon: Calculator },
  { title: "المدير المالي", image: "/landing/role-finance-v5.webp", copy: "تصور لدور يراجع المؤشرات والقيود قبل الاعتماد ويقرأ الصورة المالية كاملة.", current: "تصور مستقبلي", icon: Landmark },
] as const;

export function RoleExperienceV7() {
  const [active, setActive] = useState(0);
  return <section className="v7-roles v7-section" id="roles" aria-labelledby="v7-roles-title" data-v7-reveal><div className="v7-shell"><div className="v7-section-head"><div><span className="v7-kicker">المنصة من زاوية فريقك</span><h2 id="v7-roles-title">لكل شخص ما يساعده على العمل.</h2></div><p>عرض الأدوار هنا يشرح التجربة، ولا يمنح صلاحيات جديدة من الصفحة العامة.</p></div><div className="v7-roles__grid">{roles.map((role, index) => { const Icon = role.icon; return <button key={role.title} className={active === index ? "is-active" : ""} onClick={() => setActive(index)} aria-pressed={active === index}><div className="v7-roles__photo"><Image src={role.image} fill sizes="(max-width: 760px) 90vw, 30vw" alt={`شخص يمثل دور ${role.title}`} /></div><div className="v7-roles__body"><span><Icon /> {role.current}</span><strong>{role.title}</strong><p>{role.copy}</p><em>استكشف الدور <ArrowLeft /></em></div></button>; })}</div><div className="v7-roles__selection" aria-live="polite"><Users /><span><strong>{roles[active].title}</strong> · {roles[active].copy}</span><Link href="#start">ابدأ الآن <ArrowLeft /></Link></div></div></section>;
}
