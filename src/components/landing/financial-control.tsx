import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, Check, FileText, Landmark, Scale, ShieldCheck, Users } from "lucide-react";

const roles = [
  {
    title: "صاحب الشركة", image: "/landing/role-owner-v5.webp", alt: "مشهد تمثيلي لصاحبة شركة تناقش تقريرًا ماليًا",
    label: "متاح في الأساس الحالي", points: ["ملف الشركة وحساباتها", "عضويات الفريق وصلاحياته", "رؤية البيانات في مكان واحد"],
    href: "#contact", action: "ابدأ بتأسيس شركتك", icon: Building2,
  },
  {
    title: "المحاسب", image: "/landing/role-accountant-v5.webp", alt: "مشهد تمثيلي لمحاسب يراجع مستندًا وحساباته",
    label: "بحسب صلاحية الوصول", points: ["بيانات الكيان حسب الدور", "مستندات وفق جاهزية الخدمة", "تفويض واضح من الشركة"],
    href: "#journey", action: "استكشف رحلة المراجعة", icon: FileText,
  },
  {
    title: "المدير المالي", image: "/landing/role-finance-v5.webp", alt: "مشهد تمثيلي لمديرة مالية تناقش رسمًا وملخصًا ماليًا",
    label: "رؤية تطويرية", points: ["فهم مصدر الأرقام", "مراجعة الاستثناءات بشريًا", "تقارير تحليلية مستقبلية"],
    href: "#people", action: "شاهد نقاش النتائج", icon: Scale,
  },
] as const;

export function FinancialControl() {
  return <section className="mc-approved-roles af-section" id="roles" aria-labelledby="mc-roles-title"><div className="af-container">
    <div className="mc-approved-heading"><span className="mc-section-kicker">كل دور يرى ما يهمه</span><h2 id="mc-roles-title">منصة واحدة... لكل من يدير أموالك</h2><p>تتغير المسؤوليات من صاحب الشركة إلى المحاسب والمدير المالي؛ والصلاحيات تحدد الوصول الفعلي.</p></div>
    <div className="mc-approved-roles__grid">{roles.map(role => <article className="mc-approved-role" key={role.title}>
      <div className="mc-approved-role__image"><Image src={role.image} fill sizes="(max-width: 700px) 100vw, (max-width: 1050px) 48vw, 31vw" alt={role.alt} loading="lazy" /></div>
      <div className="mc-approved-role__body"><span className="mc-approved-role__icon"><role.icon aria-hidden="true" /></span><span className="mc-approved-role__state">{role.label}</span><h3>{role.title}</h3><ul>{role.points.map(point => <li key={point}><Check aria-hidden="true" />{point}</li>)}</ul><Link href={role.href}>{role.action} <ArrowLeft aria-hidden="true" /></Link></div>
    </article>)}</div><p className="mc-approved-roles__note">الصور مشاهد تمثيلية؛ الأشخاص ليسوا موظفين أو عملاء حقيقيين للمنصة.</p>
  </div></section>;
}

export function ProductReadiness() {
  return <section className="mc-readiness" aria-labelledby="mc-readiness-title"><div className="af-container mc-readiness__inner"><div className="mc-readiness__intro"><span className="mc-section-kicker">وضوح في حالة المنتج</span><h2 id="mc-readiness-title">ما المتاح الآن، وما الذي نطوّره؟</h2><p>ابدأ بتنظيم شركة وفريقها، واستكشف تصورًا للمراحل المحاسبية القادمة.</p></div><div className="mc-readiness__columns"><div><span className="mc-readiness__state"><ShieldCheck /> متاح في الأساس الحالي</span><ul><li><Building2 /> ملف الشركة وبياناتها الأساسية</li><li><Landmark /> تسجيل الحسابات البنكية</li><li><Users /> العضويات والأدوار والتفويضات</li><li><FileText /> عرض المستندات حسب الصلاحية؛ الرفع حسب تفعيل الخدمة</li></ul></div><div><span className="mc-readiness__state mc-readiness__state--vision"><Scale /> رؤية المراحل القادمة</span><ul><li>استخراج ومراجعة كشوف البنوك وExcel</li><li>القيود ودفتر الأستاذ وميزان المراجعة</li><li>القوائم المالية وتحليل نتائج النشاط</li><li>رؤية تكاليف الإنتاج للمصانع</li></ul></div></div></div></section>;
}
