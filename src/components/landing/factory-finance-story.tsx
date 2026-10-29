"use client";

import { useState } from "react";
import { Factory, Landmark, Layers3, Scale } from "lucide-react";
import { IndustrialCutaway, type FactoryCost } from "./dimensional-scenes";

const costs: { id: FactoryCost; label: string; value: string; explanation: string }[] = [
  { id: "materials", label: "خامات مباشرة", value: "120,000", explanation: "الخامات تدخل أولًا إلى مخزن المواد ثم خط الإنتاج." },
  { id: "labor", label: "أجور مباشرة", value: "60,000", explanation: "الأجور المباشرة مرتبطة بعمليات التصنيع نفسها." },
  { id: "overhead", label: "تكاليف صناعية غير مباشرة", value: "40,000", explanation: "تشمل تكاليف التصنيع غير المباشرة المرتبطة ببيئة الإنتاج." },
];

export function FactoryFinanceStory() {
  const [selected, setSelected] = useState<FactoryCost>("materials");

  return <section className="mc-factory af-section" id="factory" aria-labelledby="mc-factory-title">
    <div className="af-container mc-factory__layout">
      <div className="mc-factory__copy">
        <span className="mc-vision-label">حالة استخدام صناعية · رؤية مستقبلية</span>
        <h2 id="mc-factory-title">افهم تكلفة التشغيل قبل ما تحكم على الربح</h2>
        <p>في المصنع، معرفة الإيرادات لوحدها مش كفاية. المهم تفهم تكلفة الخامات والتشغيل والمصروفات وتأثيرها على النتيجة.</p>
        <div className="mc-factory__illustration"><IndustrialCutaway selected={selected} /><span>رسم توضيحي · لا توجد وحدة إنتاج مفعّلة</span></div>
        <div className="mc-factory__key"><span><Factory /> تكلفة تصنيع</span><span><Layers3 /> مصروفات فترة منفصلة</span><span><Landmark /> أثر على هامش الربح</span></div>
      </div>
      <div className="mc-factory__analysis" aria-label="مثال افتراضي لتوزيع تكلفة الإنتاج والربح">
        <header><div><small>مثال مالي افتراضي · EGP</small><h3>أين تتكوّن التكلفة؟</h3></div><Scale /></header>
        <div className="mc-factory__stack" aria-label="خامات 120 ألف، أجور مباشرة 60 ألف، تكاليف صناعية غير مباشرة 40 ألف"><span className="materials" /><span className="labor" /><span className="overhead" /></div>
        <div className="mc-factory__costs">{costs.map(cost => <button key={cost.id} type="button" className={selected === cost.id ? "is-active" : ""} aria-pressed={selected === cost.id} onClick={() => setSelected(cost.id)}><i className={cost.id} /><span>{cost.label}</span><b dir="ltr">{cost.value}</b></button>)}</div>
        <p className="mc-factory__selection" aria-live="polite">{costs.find(cost => cost.id === selected)?.explanation}</p>
        <div className="mc-factory__subtotal"><span>تكلفة الإنتاج المباع</span><strong dir="ltr">220,000</strong></div>
        <div className="mc-factory__profit"><div><span>مبيعات افتراضية</span><b dir="ltr">300,000</b></div><div><span>مجمل الربح</span><b dir="ltr">80,000</b></div><div><span>مصروفات إدارية وبيعية <small>(20,000 + 10,000)</small></span><b dir="ltr">(30,000)</b></div><div className="mc-factory__result"><span>ربح تشغيلي توضيحي</span><strong dir="ltr">50,000 EGP</strong></div></div>
        <p>يفترض المثال بيع كامل الإنتاج؛ المصروفات الإدارية والبيعية لا تُحمّل على تكلفة المخزون. نظام تكاليف المصانع غير متاح حاليًا.</p>
      </div>
    </div>
  </section>;
}
