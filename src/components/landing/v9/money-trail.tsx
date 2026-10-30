"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FileSearch, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { formatEgp, horizonOpening, horizonTransactions, runningBalance, trailSamples } from "./demo-data";

const stages = [
  { label: "المصدر", short: "كشف البنك" },
  { label: "الاستخراج", short: "حقول منظّمة" },
  { label: "التحقق", short: "حساب ثم مستند" },
  { label: "القيد المقترح", short: "طرفان متساويان" },
  { label: "المراجعة", short: "قرار بشري" },
  { label: "الأثر", short: "بعد اعتماد حقيقي" },
] as const;

export function MoneyTrail({ tourStage }: { tourStage?: number }) {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [stage, setStage] = useState(tourStage ?? 0);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const section = useRef<HTMLElement>(null);
  const sample = trailSamples[sampleIndex];
  const transaction = horizonTransactions[sample.transactionIndex];
  const previousBalance = sample.transactionIndex === 0 ? horizonOpening : runningBalance(sample.transactionIndex - 1);
  const nextBalance = runningBalance(sample.transactionIndex);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !inView) return;
    if (stage >= stages.length - 1) return;
    const timer = window.setTimeout(() => { setStage(stage + 1); if (stage + 1 === stages.length - 1) setPlaying(false); }, 1050);
    return () => window.clearTimeout(timer);
  }, [playing, inView, stage]);

  const go = (value: number) => { setPlaying(false); setStage(Math.max(0, Math.min(stages.length - 1, value))); };
  const chooseSample = (value: number) => { setPlaying(false); setStage(0); setSampleIndex(value); };
  const replay = () => { setStage(0); setPlaying(true); };

  return <section id="money-trail" ref={section} className="mc9-trail mc9-section" aria-labelledby="mc9-trail-title"><div className="mc9-wrap"><div className="mc9-section-heading"><div><span className="mc9-overline">03 / MONEY TRAIL</span><h2 id="mc9-trail-title">كل حركة مالية<br /><em>ليها قصة واضحة.</em></h2></div><p>اختار حركة تجريبية، واتبعها من كشف البنك حتى أثرها المحاسبي المقترح. لا معالجة فعلية ولا ترحيل قيود.</p></div><div className="mc9-trail-shell"><div className="mc9-trail-sidebar"><span>حركات من كشف Horizon الافتراضي</span>{trailSamples.map((item, index) => { const row = horizonTransactions[item.transactionIndex]; return <button type="button" key={row.reference} aria-pressed={sampleIndex === index} onClick={() => chooseSample(index)}><small dir="ltr">{row.reference}</small><strong>{item.label}</strong><b dir="ltr">{formatEgp(item.amount)} EGP</b></button>; })}<p>اختيار الحركة يغيّر المصدر والتحقق والقيد والأثر.</p></div><div className="mc9-trail-main"><div className="mc9-trail-top"><span>الرحلة: {sample.label}</span><strong dir="ltr">{transaction.reference}</strong><span className="mc9-demo-tag">معاينة مستقبلية · بيانات افتراضية</span></div><div className="mc9-trail-progress" role="group" aria-label="مراحل رحلة الحركة">{stages.map((item, index) => <button type="button" key={item.label} aria-current={stage === index ? "step" : undefined} onClick={() => go(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong></button>)}</div><div className="mc9-trail-stage" key={`${sampleIndex}-${stage}`} aria-live="polite">
  {stage === 0 && <><div className="mc9-stage-kicker">01 / SOURCE DOCUMENT</div><h3>الحركة بدأت في كشف بنك افتراضي.</h3><p>هذا سجل معروض للشرح. لم يرفع الزائر ملفًا ولم يُقرأ مستند حقيقي.</p><div className="mc9-source-row"><span>التاريخ <b dir="ltr">{transaction.date}/2026</b></span><span>المرجع <b dir="ltr">{transaction.reference}</b></span><span>البيان <b>{transaction.description}</b></span><span>المبلغ <b dir="ltr">{formatEgp(sample.amount)} EGP</b></span></div><div className="mc9-stage-equation">رصيد سابق <b dir="ltr">{formatEgp(previousBalance)}</b><ArrowLeft size={17} /> رصيد بعد الحركة <b dir="ltr">{formatEgp(nextBalance)}</b></div></>}
  {stage === 1 && <><div className="mc9-stage-kicker">02 / STRUCTURED FIELDS</div><h3>من سطر بنك إلى حقول قابلة للفحص.</h3><p>تمثيل بصري لاستخراج تجريبي؛ لا توجد معالجة PDF مباشرة على الموقع.</p><div className="mc9-extraction"><div><small>DATE</small><strong dir="ltr">{transaction.date}/2026</strong></div><div><small>REFERENCE</small><strong dir="ltr">{transaction.reference}</strong></div><div><small>DESCRIPTION</small><strong>{transaction.description}</strong></div><div><small>{transaction.credit ? "CREDIT" : "DEBIT"}</small><strong dir="ltr">{formatEgp(sample.amount)} EGP</strong></div></div></>}
  {stage === 2 && <><div className="mc9-stage-kicker">03 / VERIFICATION</div><h3>الحساب متوازن. والمستند لسه محتاج مراجعة.</h3><p>مطابقة المعادلة الحسابية وحدها لا تثبت صحة المستند أو تصنيف الحركة.</p><div className="mc9-verification"><div><Check size={19} /><span>تطابق حسابي</span><strong dir="ltr">{formatEgp(previousBalance)} {transaction.credit ? "+" : "−"} {formatEgp(sample.amount)} = {formatEgp(nextBalance)}</strong></div><div><FileSearch size={19} /><span>تحقق مستندي</span><strong>معلّق: {sample.review}</strong></div></div></>}
  {stage === 3 && <><div className="mc9-stage-kicker">04 / PROPOSED JOURNAL</div><h3>قيد تعليمي مقترح. لم يُرحّل.</h3><p>{sample.meaning}</p><table className="mc9-journal"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody><tr><td>{sample.debitAccount}</td><td dir="ltr">{formatEgp(sample.amount)}</td><td>—</td></tr><tr><td>{sample.creditAccount}</td><td>—</td><td dir="ltr">{formatEgp(sample.amount)}</td></tr></tbody><tfoot><tr><th>الإجمالي</th><th dir="ltr">{formatEgp(sample.amount)}</th><th dir="ltr">{formatEgp(sample.amount)}</th></tr></tfoot></table></>}
  {stage === 4 && <><div className="mc9-stage-kicker">05 / HUMAN REVIEW</div><h3>بانتظار مراجعة واعتماد المحاسب.</h3><p>المعالجة المقترحة لا تصبح قيدًا حقيقيًا إلا بعد فحص المصدر والمستند والتصنيف ثم اعتماد بشري داخل نظام فعلي.</p><div className="mc9-review-list"><span><Check size={17} /> المعادلة الحسابية متسقة</span><span><FileSearch size={17} /> {sample.review}</span><span><FileSearch size={17} /> لا يوجد اعتماد أو ترحيل من هذه الصفحة</span></div></>}
  {stage === 5 && <><div className="mc9-stage-kicker">06 / FINANCIAL IMPACT</div><h3>الأثر المقصود بعد اعتماد وترحيل حقيقي.</h3><p>{sample.impact}</p><div className="mc9-impact-flow"><div><small>مصدر افتراضي</small><strong>{transaction.description}</strong></div><ArrowLeft size={24} /><div><small>قيد مقترح</small><strong>{sample.debitAccount} / {sample.creditAccount}</strong></div><ArrowLeft size={24} /><div><small>أثر تعليمي</small><strong>{sample.impact}</strong></div></div><small className="mc9-impact-note">لم تتغير أي حسابات أو سجلات حقيقية.</small></>}
  </div><div className="mc9-trail-controls"><button type="button" onClick={() => go(stage - 1)} disabled={stage === 0}><ChevronRight size={17} /> السابق</button><button type="button" className="mc9-trail-play" onClick={() => { if (playing) setPlaying(false); else { if (stage === stages.length - 1) setStage(0); setPlaying(true); } }}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? "إيقاف مؤقت" : stage === 0 ? "شغّل الرحلة" : "استكمل الرحلة"}</button><button type="button" onClick={() => go(stage + 1)} disabled={stage === stages.length - 1}>التالي <ChevronLeft size={17} /></button><button type="button" onClick={replay} aria-label="إعادة الرحلة"><RotateCcw size={17} /></button><button type="button" onClick={() => go(stages.length - 1)} aria-label="تجاوز الحركة"><SkipForward size={17} /></button><span className="mc9-trail-counter" dir="ltr">{stage + 1} / {stages.length}</span></div></div></div></div></section>;
}
