"use client";

import { useState } from "react";
import { Check, FileClock, Landmark, ShieldCheck, Users, Wallet } from "lucide-react";
import { formatEgp, horizonClosing, sectors, type Sector } from "./demo-data";

type PhoneView = "company" | "pulse" | "review" | "team";

const views: { id: PhoneView; label: string; title: string; copy: string; future: boolean }[] = [
  { id: "company", label: "شركتي", title: "شركتك معاك، أينما كنت.", copy: "ملف الشركة والحسابات المسجلة والتفويض في شاشة واضحة.", future: false },
  { id: "pulse", label: "النبض المالي", title: "افهم الحركة قبل الرقم.", copy: "تصور لملخص مالي مستقبلي بأرقام بنك Horizon الافتراضية.", future: true },
  { id: "review", label: "المراجعة", title: "اعرف إيه اللي محتاج مراجعة.", copy: "إشارات تجريبية للمستندات والتكرار، من غير اعتماد تلقائي.", future: true },
  { id: "team", label: "الفريق", title: "كل فرد يعرف حدود دوره.", copy: "أعضاء الشركة، أدوارهم، وحالة التفويض ضمن الأساس المتاح.", future: false },
];

function PhoneScreen({ view, sector }: { view: PhoneView; sector: Sector }) {
  const company = sectors[sector].company;
  if (view === "company") return <><div className="mc9-cfo-greeting"><span>صباح الخير، أحمد</span><h3>شركتي</h3></div><div className="mc9-cfo-company"><small>ملف الشركة</small><strong>{company}</strong><span><Check size={13} /> بيانات منظمة</span></div><div className="mc9-cfo-list"><div><Landmark size={18} /><span>الحسابات المسجلة</span><b>٢</b></div><div><Users size={18} /><span>أعضاء الفريق</span><b>٤</b></div><div><ShieldCheck size={18} /><span>التفويض</span><b>بانتظار الموافقة</b></div></div><p className="mc9-cfo-note">بيانات حسابات فقط؛ لا أرصدة حية.</p></>;
  if (view === "pulse") return <><div className="mc9-cfo-greeting"><span>معاينة مستقبلية / كشف افتراضي</span><h3>النبض المالي</h3></div><div className="mc9-cfo-balance"><small>رصيد ختامي لكشف Horizon التجريبي</small><strong dir="ltr">{formatEgp(horizonClosing)} <i>EGP</i></strong><span>42,500 + 56,700 − 33,010</span></div><div className="mc9-cfo-list"><div><Wallet size={18} /><span>تحصيلات الكشف</span><b dir="ltr">56,700</b></div><div><Wallet size={18} /><span>مدفوعات الكشف</span><b dir="ltr">33,010</b></div><div><FileClock size={18} /><span>إشارات للمراجعة</span><b>٣</b></div></div><p className="mc9-cfo-note">ليست بيانات بنك متصل أو رصيد شركة حقيقي.</p></>;
  if (view === "review") return <><div className="mc9-cfo-greeting"><span>معاينة مستقبلية / مراجعة بشرية</span><h3>ما يحتاج انتباهك</h3></div><div className="mc9-cfo-review"><b>مستند داعم</b><span dir="ltr">HTB-260201</span><small>تحصيل عميل يحتاج فاتورة ومطابقة.</small></div><div className="mc9-cfo-review"><b>تحقق من التكرار</b><span dir="ltr">HTB-260209</span><small>راجع مرجع التحصيل قبل الاعتماد.</small></div><div className="mc9-cfo-review"><b>طرف غير محدد</b><span dir="ltr">HTB-260206</span><small>حدّد المستفيد ومستند الصرف.</small></div><p className="mc9-cfo-note">لا توجد موافقة أو معالجة آلية من هذه الشاشة.</p></>;
  return <><div className="mc9-cfo-greeting"><span>الشركة / الوصول</span><h3>فريق الشركة</h3></div><div className="mc9-cfo-list mc9-cfo-team"><div><span className="mc9-cfo-avatar">أ</span><span>أحمد سالم</span><b>مالك</b></div><div><span className="mc9-cfo-avatar">م</span><span>منى فؤاد</span><b>مدير مالي</b></div><div><span className="mc9-cfo-avatar">ي</span><span>يوسف علي</span><b>محاسب</b></div><div><span className="mc9-cfo-avatar">س</span><span>سارة محمود</span><b>مشاهِد</b></div></div><div className="mc9-cfo-delegation"><ShieldCheck size={18} /> تفويض المكتب: بانتظار موافقة الشركة</div><p className="mc9-cfo-note">الأسماء المعروضة افتراضية.</p></>;
}

export function PocketCfo({ sector, tourView }: { sector: Sector; tourView?: PhoneView }) {
  const [view, setView] = useState<PhoneView>(tourView ?? "company");
  const selected = views.find(item => item.id === view)!;
  return <section id="pocket-cfo" className="mc9-pocket mc9-section" aria-labelledby="mc9-pocket-title"><div className="mc9-wrap mc9-pocket-layout"><div className="mc9-pocket-copy"><span className="mc9-overline">05 / POCKET CFO</span><h2 id="mc9-pocket-title">شركتك تحت عينك.<br /><em>حتى من الموبايل.</em></h2><p>نفس السياق، بأربع زوايا واضحة. اختار الشاشة وشوف الواجهة تتغير قدامك.</p><div className="mc9-pocket-tabs" role="group" aria-label="شاشات مركز الموبايل">{views.map(item => <button type="button" key={item.id} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}<span>{item.future ? "تصور" : "حالي"}</span></button>)}</div><div className="mc9-pocket-explain" aria-live="polite"><span>{selected.future ? "معاينة مستقبلية — بيانات افتراضية" : "الأساس المتاح حاليًا"}</span><strong>{selected.title}</strong><p>{selected.copy}</p></div></div><div className="mc9-pocket-stage"><div className="mc9-pocket-halo" aria-hidden="true" /><div className="mc9-cfo-phone"><div className="mc9-cfo-notch" /><div className="mc9-cfo-status" dir="ltr"><span>9:41</span><span>●●● ▰</span></div><div className="mc9-cfo-logo"><b>MC</b><span>Money Coder</span></div><div className="mc9-cfo-content" key={`${view}-${sector}`} aria-live="polite"><PhoneScreen view={view} sector={sector} /></div><div className="mc9-cfo-bottom" aria-hidden="true"><span>الرئيسية</span><span>الشركة</span><span>المراجعة</span><span>الفريق</span></div></div></div></div></section>;
}
