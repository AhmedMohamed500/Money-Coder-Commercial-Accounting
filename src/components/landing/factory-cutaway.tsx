import Image from "next/image";
import { Landmark } from "lucide-react";
import type { FactoryCost } from "./dimensional-scenes";
import { factoryExample, money } from "./accounting-demo-data";

export function IndustrialCutaway({ selected = null, compact = false }: { selected?: FactoryCost | null; compact?: boolean }) {
  return <div className={`mc-industrial-scene mc-industrial-scene--photo ${compact ? "mc-industrial-scene--compact" : ""}`} role="img" aria-label="تصور صناعي افتراضي: استلام الخامات ومخزنها يسارًا، آلات وخط إنتاج في المنتصف، مرافق ومصاريف صناعية أعلى اليمين، مخزن منتج نهائي ومنطقة شحن يمينًا. المنطقة المختارة مميزة بصريًا.">
    <div className="mc-industrial-scene__photo">
      <Image src="/landing/factory-cutaway-v2.webp" width={1400} height={700} sizes={compact ? "(max-width: 820px) 100vw, 500px" : "(max-width: 820px) 100vw, 640px"} alt="" loading="lazy" />
      <span className={`mc-industrial-scene__region mc-industrial-scene__region--materials ${selected === "materials" ? "is-active" : ""}`} aria-hidden="true" />
      <span className={`mc-industrial-scene__region mc-industrial-scene__region--labor ${selected === "labor" ? "is-active" : ""}`} aria-hidden="true" />
      <span className={`mc-industrial-scene__region mc-industrial-scene__region--overhead ${selected === "overhead" ? "is-active" : ""}`} aria-hidden="true" />
    </div>
    <div className="mc-industrial-scene__labels" aria-hidden="true"><span className={selected === "materials" ? "is-active" : ""}>استلام ومخزن الخامات <b>{money(factoryExample.materials)}</b></span><span className={selected === "labor" ? "is-active" : ""}>آلات وعمل مباشر <b>{money(factoryExample.labor)}</b></span><span className={selected === "overhead" ? "is-active" : ""}>مرافق وتكاليف صناعية <b>{money(factoryExample.overhead)}</b></span></div>
    {!compact && <div className="mc-industrial-scene__caption"><Landmark /> مسار افتراضي: استلام ← تخزين ← تصنيع ← منتج نهائي ← شحن</div>}
  </div>;
}
