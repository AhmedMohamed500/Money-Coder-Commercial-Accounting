"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { closingBankBalance, demoTransactions, incomeStatement, money } from "./accounting-demo-data";

const roles = [
  { title: "صاحب الشركة", question: "ماذا يحدث في شركتي؟", image: "/landing/role-owner-v5.webp", alt: "مشهد تمثيلي لصاحبة شركة تراجع بيانات العمل", view: "ملف الشركة وأعضاء الفريق والحسابات المسجلة", result: "رؤية أوضح للكيان والمسؤوليات من مساحة واحدة.", value: "ملف الشركة", note: "متاح ضمن أساس المنتج الحالي", href: "#platform", action: "استكشف ملف الشركة" },
  { title: "المحاسب", question: "أي حركة تحتاج فحصًا؟", image: "/landing/role-accountant-v5.webp", alt: "مشهد تمثيلي لمحاسب يراجع مستندًا", view: `حركة ${demoTransactions[2].reference}: ${demoTransactions[2].reviewReason}`, result: "يبدأ القرار من المستند والمراجعة البشرية، لا من رقم منفصل.", value: `${money(demoTransactions[2].debit)} EGP`, note: "مثال مراجعة ضمن خطة التطوير", href: "#journey", action: "استكشف رحلة المراجعة" },
  { title: "المدير المالي", question: "ما معنى هذه الأرقام؟", image: "/landing/role-finance-v5.webp", alt: "مشهد تمثيلي لمديرة مالية تناقش تحليلًا ماليًا", view: `رصيد إقفال البنك ${money(closingBankBalance)} EGP، وصافي ربح سيناريو أوسع ${money(incomeStatement.profit)} EGP`, result: "يقرأ سياق الإيراد والمصروف وأثر الحركة قبل اتخاذ قرار.", value: `${money(incomeStatement.profit)} EGP`, note: "تقرير توضيحي غير متاح حيًا", href: "#journey", action: "شاهد مثال القوائم" },
] as const;

export function FinancialControl() {
  const [selected, setSelected] = useState(0);
  const active = roles[selected];
  return <section className="mc-approved-roles af-section" id="roles" aria-labelledby="mc-roles-title"><div className="af-container">
    <div className="mc-approved-heading"><span className="mc-section-kicker">نتيجة مختلفة لكل مسؤول</span><h2 id="mc-roles-title">نفس البيانات... قرارات مختلفة لكل مسؤول</h2><p>اختر دورًا لترى السؤال الذي يبدأ منه، والبيانات التي يحتاجها، وما هو متاح اليوم أو معروض كمثال.</p></div>
    <div className="mc-role-switch" role="group" aria-label="اختر مسؤولًا">{roles.map((role, index) => <button key={role.title} type="button" aria-pressed={selected === index} aria-controls="mc-role-detail" onClick={() => setSelected(index)}>{role.title}</button>)}</div>
    <div className="mc-role-detail" id="mc-role-detail"><div className="mc-role-detail__photo"><Image src={active.image} fill sizes="(max-width: 820px) 100vw, 43vw" alt={active.alt} loading="lazy" /></div><div className="mc-role-detail__copy" aria-live="polite"><span>{active.note}</span><h3>{active.question}</h3><p>{active.view}</p><div><small>{active.title} يركز على</small><strong>{active.value}</strong></div><p>{active.result}</p><Link href={active.href}>{active.action} <ArrowLeft aria-hidden="true" /></Link></div></div>
    <p className="mc-approved-roles__note">الصور مشاهد تمثيلية، وليست لأعضاء فريق أو عملاء حقيقيين للمنصة. صلاحيات الوصول الفعلية يحددها الدور والتفويض.</p>
  </div></section>;
}
