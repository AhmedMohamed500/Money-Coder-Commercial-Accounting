"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { baselineScenario, formatEgp, projectedCash, type Scenario } from "./demo-data";

const controls: { key: keyof Scenario; label: string; max: number; step: number; hint: string }[] = [
  { key: "opening", label: "النقدية في أول الفترة", max: 150_000, step: 1_000, hint: "نقطة البداية الافتراضية" },
  { key: "collections", label: "التحصيلات المتوقعة", max: 120_000, step: 1_000, hint: "ما يُتوقع دخوله خلال الفترة" },
  { key: "payments", label: "المدفوعات المتوقعة", max: 120_000, step: 1_000, hint: "ما يُتوقع خروجه خلال الفترة" },
  { key: "extraExpenses", label: "مصروفات تشغيل إضافية", max: 80_000, step: 1_000, hint: "قرار إنفاق جديد في السيناريو" },
  { key: "delayedCollections", label: "تحصيلات متأخرة", max: 120_000, step: 1_000, hint: "تُخصم من التحصيلات المتوقعة مرة واحدة" },
];

export function DecisionLab({ tourActive = false }: { tourActive?: boolean }) {
  const [scenario, setScenario] = useState<Scenario>({ ...baselineScenario, delayedCollections: tourActive ? 10_000 : 0 });
  const baseline = projectedCash(baselineScenario);
  const projected = projectedCash(scenario);
  const difference = projected - baseline;
  const visibleCollections = Math.max(0, scenario.collections - scenario.delayedCollections);
  const maxBar = Math.max(Math.abs(baseline), Math.abs(projected), 1);
  const setValue = (key: keyof Scenario, value: number) => setScenario(current => ({ ...current, [key]: value, delayedCollections: key === "collections" ? Math.min(current.delayedCollections, value) : key === "delayedCollections" ? Math.min(value, current.collections) : current.delayedCollections }));
  return <section id="decision-lab" className="mc9-decision mc9-section" aria-labelledby="mc9-decision-title"><div className="mc9-wrap"><div className="mc9-section-heading"><div><span className="mc9-overline">06 / DECISION LAB</span><h2 id="mc9-decision-title">جرّب القرار<br /><em>قبل ما تنفذه.</em></h2></div><p>غيّر الافتراضات وشوف أثرها الحسابي فورًا. معادلة واضحة، من غير توقعات احتمالية أو ادعاء ذكاء اصطناعي.</p></div><div className="mc9-decision-shell"><div className="mc9-decision-inputs"><div className="mc9-decision-input-head"><div><strong>افتراضات فترة تجريبية</strong><span>كل القيم بالجنيه المصري · بيانات افتراضية</span></div><button type="button" onClick={() => setScenario({ ...baselineScenario })}><RotateCcw size={16} /> رجّع الافتراضات الأصلية</button></div>{controls.map(control => <label className="mc9-slider" key={control.key}><span><strong>{control.label}</strong><small>{control.hint}</small></span><output dir="ltr">{formatEgp(scenario[control.key])} EGP</output><input type="range" min="0" max={control.key === "delayedCollections" ? scenario.collections : control.max} step={control.step} value={scenario[control.key]} onChange={event => setValue(control.key, Number(event.target.value))} aria-label={control.label} style={{ backgroundSize: `${scenario[control.key] / Math.max(1,control.key === "delayedCollections" ? scenario.collections : control.max) * 100}% 100%` }} /></label>)}</div><div className="mc9-decision-results" aria-live="polite"><span className="mc9-demo-tag">محاكاة افتراضية · ليست توقعًا ماليًا معتمدًا</span><h3>الرصيد المتوقع بنهاية الفترة</h3><strong className={projected < 0 ? "mc9-negative" : ""} dir="ltr">{formatEgp(projected)} <small>EGP</small></strong><div className="mc9-delta">{difference >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}<span>{difference === 0 ? "نفس السيناريو الأساسي" : `${difference > 0 ? "زيادة" : "انخفاض"} ${formatEgp(Math.abs(difference))} ج.م عن الأساس`}</span></div><div className="mc9-scenario-bars"><div><span>الأساس <b dir="ltr">{formatEgp(baseline)}</b></span><i style={{ width: `${Math.abs(baseline) / maxBar * 100}%` }} /></div><div><span>بعد التغيير <b dir="ltr">{formatEgp(projected)}</b></span><i className={projected < 0 ? "mc9-bar-negative" : ""} style={{ width: `${Math.abs(projected) / maxBar * 100}%` }} /></div></div><div className="mc9-formula"><small>المعادلة المستخدمة</small><p>نقدية البداية + (التحصيلات − المتأخر منها) − المدفوعات − المصروفات الإضافية</p><strong dir="ltr">{formatEgp(scenario.opening)} + {formatEgp(visibleCollections)} − {formatEgp(scenario.payments)} − {formatEgp(scenario.extraExpenses)} = {formatEgp(projected)}</strong></div>{projected < 0 && <p className="mc9-scenario-warning">تنبيه سيناريو: المدفوعات الافتراضية تتجاوز النقدية المتاحة في هذه الافتراضات. راجع التوقيت أو حجم المدفوعات؛ هذا ليس إنذارًا ماليًا فعليًا.</p>}</div></div></div></section>;
}
