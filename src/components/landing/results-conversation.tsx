"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleAlert, Landmark, TrendingUp } from "lucide-react";
import { closingBankBalance, demoTransactions, incomeStatement, money } from "./accounting-demo-data";

const moments = [
  {
    icon: Landmark,
    role: "المحاسب",
    title: "رصيد إقفال البنك",
    value: closingBankBalance,
    explanation: "يقارن رصيد الإقفال بالحركات الواردة في كشف البنك قبل اعتماد أي نتيجة.",
  },
  {
    icon: CircleAlert,
    role: "المدير المالي",
    title: "حركة تحتاج تفسيرًا",
    value: demoTransactions[2].debit,
    explanation: "يسأل عن المستند المرتبط بحركة المصروف قبل تحديد تصنيفها المحاسبي.",
  },
  {
    icon: TrendingUp,
    role: "صاحب الشركة",
    title: "صافي ربح المثال",
    value: incomeStatement.profit,
    explanation: "يناقش معنى الربح بعد مراجعة المصروفات، بدل الاعتماد على الرقم وحده.",
  },
] as const;

export function ResultsConversation() {
  const [selected, setSelected] = useState(0);
  const active = moments[selected];

  return <section className="mc-people af-section" id="people" aria-labelledby="mc-people-title">
    <div className="af-container">
      <div className="mc-people__heading"><span className="mc-section-kicker">النتيجة تبدأ حوارًا</span><h2 id="mc-people-title">عندما يناقش فريقك النتائج</h2><p>في هذا المثال الافتراضي، يناقش الفريق رصيد البنك وحركة تحتاج تفسيرًا قبل قراءة نتيجة النشاط.</p></div>
      <div className="mc-people__layout">
        <div className="mc-people__results" role="group" aria-label="اختر نتيجة من المثال المالي التوضيحي">
          {moments.map(({ icon: Icon, role, title, value }, index) => <button key={title} type="button" className={selected === index ? "is-active" : ""} aria-pressed={selected === index} aria-controls="mc-people-explanation" onClick={() => setSelected(index)}><span className="mc-people__icon"><Icon aria-hidden="true" /></span><span className="mc-people__result-copy"><small>{role}</small><strong>{title}</strong></span><b dir="ltr">{money(value)} <small>EGP</small></b></button>)}
          <p className="mc-people__explanation" id="mc-people-explanation" aria-live="polite"><strong>{active.role}:</strong> {active.explanation}</p>
          <p className="mc-people__disclaimer">مشهد وبيانات توضيحية. معالجة الحركات والتقارير المحاسبية ضمن الرؤية القادمة، وليست نتائج حيّة من النظام الحالي.</p>
        </div>
        <div className="mc-people__photo"><Image src="/landing/finance-team-review-v4.webp" width={1400} height={788} sizes="(max-width: 820px) 100vw, 52vw" alt="مشهد تمثيلي لثلاثة محترفين يناقشون رسمًا ماليًا على حاسوب في اجتماع" loading="lazy" /><span>مشهد تمثيلي · فريق يناقش الأرقام</span></div>
      </div>
    </div>
  </section>;
}
