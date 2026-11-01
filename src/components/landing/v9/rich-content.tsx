import Image from "next/image";
import { ArrowLeft, ArrowUpLeft, Building2, Check, ChevronDown, Landmark, ShieldCheck, Users } from "lucide-react";
import type { Persona } from "./demo-data";

const foundations = [
  { number: "01", icon: Building2, title: "ملف شركة واضح", description: "بيانات الشركة الأساسية ونوع نشاطها في مساحة واحدة تبدأ منها رحلتك." },
  { number: "02", icon: Landmark, title: "حسابات مسجّلة", description: "سجّل حسابات الشركة البنكية للرجوع إليها، من دون ادعاء وجود اتصال مباشر بالبنك." },
  { number: "03", icon: Users, title: "فريق يعرف دوره", description: "أضف الأعضاء وحدد الأدوار والصلاحيات المناسبة لطريقة عمل شركتك." },
  { number: "04", icon: ShieldCheck, title: "تفويض تحت سيطرتك", description: "راجع طلبات الوصول ووافق عليها قبل أن يبدأ مكتب المحاسبة العمل معك." },
] as const;

export function FoundationStrip() {
  return <section id="what-is-ready" className="mc9-foundation mc9-section" aria-labelledby="mc9-foundation-title">
    <div className="mc9-wrap">
      <div className="mc9-foundation-heading">
        <div><span className="mc9-overline">الأساس الذي يمكنك البدء به الآن</span><h2 id="mc9-foundation-title">مساحة شركتك، <em>مرتّبة من البداية.</em></h2></div>
        <p>قبل الأرقام والرسوم، تحتاج الشركة إلى بيانات واضحة ومن يملك حق الوصول إليها. هذه هي الخطوات المتاحة اليوم داخل المنتج.</p>
      </div>
      <div className="mc9-foundation-grid">{foundations.map(item => <article className="mc9-foundation-card" key={item.number}>
        <div className="mc9-foundation-card-top"><span dir="ltr">{item.number} / 04</span><item.icon size={23} strokeWidth={1.7} aria-hidden="true" /></div>
        <h3>{item.title}</h3><p>{item.description}</p><span className="mc9-foundation-status"><Check size={14} aria-hidden="true" /> متاح في مساحة العمل</span>
      </article>)}</div>
      <a className="mc9-foundation-link" href="#command-center">شاهد كيف تظهر هذه البيانات في مساحة العمل <ArrowLeft size={17} aria-hidden="true" /></a>
    </div>
  </section>;
}

const roles: { id: Persona; image: string; label: string; detail: string }[] = [
  { id: "owner", image: "/landing/role-owner-v5.webp", label: "صاحب الشركة", detail: "يرى الصورة العامة ويحدد من يدخل إلى مساحة الشركة." },
  { id: "finance", image: "/landing/role-finance-v5.webp", label: "المسؤول المالي", detail: "يراجع الحسابات المسجلة وأعضاء الفريق في سياق واحد." },
  { id: "accountant", image: "/landing/role-accountant-v5.webp", label: "المحاسب", detail: "يعمل وفق الدور والصلاحيات التي مُنحت له داخل الشركة." },
];

export function TeamInFocus({ onChooseRole }: { onChooseRole: (role: Persona) => void }) {
  return <section id="team-in-focus" className="mc9-people mc9-section" aria-labelledby="mc9-people-title">
    <div className="mc9-wrap mc9-people-layout">
      <div className="mc9-people-visual"><Image src="/landing/global-finance-team-v10.webp" alt="فريق مالي يناقش رسمًا بيانيًا في غرفة اجتماعات حديثة، مشهد توضيحي" fill sizes="(max-width: 900px) 100vw, 52vw" />
        <div className="mc9-people-caption"><span>مشهد توضيحي</span><strong>النقاش يبدأ عندما تكون البيانات واضحة للجميع.</strong></div>
      </div>
      <div className="mc9-people-copy"><span className="mc9-overline">الأشخاص وراء كل قرار</span><h2 id="mc9-people-title">نفس الشركة.<br /><em>رؤية مناسبة لكل دور.</em></h2>
        <p>صاحب الشركة والمسؤول المالي والمحاسب يحتاجون إلى سياق مشترك، مع حدود وصول واضحة. اختر دورًا لتشاهد معاينة مساحة العمل من وجهة نظره.</p>
        <div className="mc9-role-list">{roles.map(role => <button type="button" key={role.id} onClick={() => onChooseRole(role.id)} aria-label={`استكشف منظور ${role.label}`}>
          <span className="mc9-role-avatar"><Image src={role.image} alt="" fill sizes="48px" /></span><span className="mc9-role-text"><strong>{role.label}</strong><small>{role.detail}</small></span><ArrowUpLeft size={17} aria-hidden="true" />
        </button>)}</div>
        <small className="mc9-people-note">صور ومشاهد العرض توضيحية. صلاحيات الوصول الفعلية تعتمد على إعدادات شركتك.</small>
      </div>
    </div>
  </section>;
}

const questions = [
  { question: "هل الأرقام والرسوم في الصفحة تخص شركات حقيقية؟", answer: "لا. كل الأرقام والواجهات المالية التفاعلية في هذه الصفحة أمثلة افتراضية لتوضيح اتجاه المنتج، وليست بيانات عملاء أو أرصدة حية." },
  { question: "هل الحساب البنكي المسجّل متصل بالبنك؟", answer: "لا. يمكنك تسجيل بيانات الحساب ضمن ملف الشركة، لكن ذلك لا يعني وجود ربط مباشر أو جلب تلقائي للحركات البنكية." },
  { question: "ما الذي أستطيع استخدامه بعد إنشاء الحساب؟", answer: "يمكنك إعداد ملف الشركة والحسابات البنكية المسجلة وإدارة أعضاء الفريق وأدوارهم والتفويضات. التجارب المالية المعروضة في الجولة معاينات توضيحية." },
  { question: "هل يستطيع مكتب المحاسبة الاطلاع على بيانات شركتي تلقائيًا؟", answer: "يبدأ الوصول وفق التفويضات والصلاحيات المعتمدة من الشركة؛ مجرد وجود المكتب لا يمنحه وصولًا تلقائيًا." },
] as const;

export function LandingQuestions() {
  return <section id="questions" className="mc9-questions mc9-section" aria-labelledby="mc9-questions-title"><div className="mc9-wrap mc9-questions-layout">
    <div className="mc9-questions-intro"><span className="mc9-overline">قبل أن تبدأ</span><h2 id="mc9-questions-title">كل حاجة<br /><em>واضحة من البداية.</em></h2><p>إجابات مباشرة عن المنتج الحالي وما تعرضه الجولة التفاعلية.</p></div>
    <div className="mc9-question-list">{questions.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.question}</strong><ChevronDown size={19} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
  </div></section>;
}
