"use client";

import Image from "next/image";
import { ArrowLeft, Check } from "lucide-react";
import { factoryExample, factoryGrossProfit, factoryOperatingProfit, factoryProductionCost } from "../accounting-demo-data";
import { formatEgp, sectors, type Sector } from "./demo-data";

const priorities: Record<Sector, string[]> = {
  commercial: ["مين مسؤول عن التحصيل؟", "إيه اللي مستني سداد المورد؟", "الحسابات البنكية المسجلة متاحة للفريق المصرّح له."],
  factory: ["كم تكلفة المواد والأجور والتحميل؟", "ماذا يبقى بعد تكلفة البضاعة المباعة؟", "الأمثلة المالية لا تمثل وحدة تكاليف حية."],
  accountingOffice: ["أي شركة وافقت على التفويض؟", "مين المسؤول عن المراجعة؟", "الوصول لبيانات العميل يبدأ بعد موافقته."],
};

export function IndustryExperience({ sector, onSector }: { sector: Sector; onSector: (value: Sector) => void }) {
  const profile = sectors[sector];
  return <section id="industries" className="mc9-industry mc9-section" aria-labelledby="mc9-industry-title"><div className="mc9-wrap"><div className="mc9-section-heading"><div><span className="mc9-overline">07 / BUSINESS CONTEXT</span><h2 id="mc9-industry-title">كل نشاط له أسئلته.<br /><em>والوضوح يبدأ منها.</em></h2></div><p>غيّر القطاع وشوف المشكلة والبيانات المناسبة له. هذه مشاهد توضيحية، وليست بيانات شركات حقيقية.</p></div><div className="mc9-industry-tabs" role="group" aria-label="اختار القطاع">{(Object.keys(sectors) as Sector[]).map(id => <button type="button" key={id} aria-pressed={sector === id} onClick={() => onSector(id)}>{sectors[id].label}</button>)}</div><div className="mc9-industry-scene" key={sector}><div className="mc9-industry-image"><Image src={profile.image} alt={profile.imageAlt} fill sizes="(max-width: 850px) 100vw, 55vw" /></div><div className="mc9-industry-panel"><span>{profile.label} / بيانات افتراضية</span><h3>{profile.focus}</h3><ul>{priorities[sector].map(item => <li key={item}><Check size={17} />{item}</li>)}</ul><div className="mc9-industry-now"><b>متاح الآن</b><p>{profile.current}</p></div><div className="mc9-industry-next"><b>الرؤية القادمة</b><p>{profile.future}</p></div>{sector === "factory" && <div className="mc9-factory-math"><span>مثال تكلفة إنتاج تعليمي</span><div><small>مواد + أجور + تكاليف صناعية</small><strong dir="ltr">{formatEgp(factoryExample.materials)} + {formatEgp(factoryExample.labor)} + {formatEgp(factoryExample.overhead)}</strong></div><div><small>تكلفة الإنتاج</small><strong dir="ltr">{formatEgp(factoryProductionCost)} EGP</strong></div><div><small>مجمل الربح بافتراض بيع كل الإنتاج</small><strong dir="ltr">{formatEgp(factoryGrossProfit)} EGP</strong></div><div><small>الربح التشغيلي بعد 30,000 مصروفات</small><strong dir="ltr">{formatEgp(factoryOperatingProfit)} EGP</strong></div><p>إذا بقي مخزون غير مباع، لا تساوي تكلفة الإنتاج تكلفة البضاعة المباعة تلقائيًا.</p></div>}<a href="#business-dna" className="mc9-industry-link">غيّر سياق العرض <ArrowLeft size={16} /></a></div></div></div></section>;
}
