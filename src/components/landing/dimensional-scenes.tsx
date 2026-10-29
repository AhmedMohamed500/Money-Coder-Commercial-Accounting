import { ArrowLeft, CircleCheck, FileSpreadsheet, FileText, Landmark, Layers3 } from "lucide-react";

export type FactoryCost = "materials" | "labor" | "overhead";

export function FinancialFlowSignature() {
  return <div className="mc-flow-signature" aria-label="من المستند إلى المعاملة ثم القيد ودفتر الأستاذ والتقرير">
    <span>مستند</span><i /><span>حركة</span><i /><span>قيد</span><i /><span>أستاذ</span><i /><span>قرار</span>
  </div>;
}

export function BankFlowPipeline() {
  return <div className="mc-bank-flow" aria-label="تصور لرحلة كشف البنك من ملف PDF إلى بيانات منظمة ثم مراجعة وExcel">
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--pdf">
      <span className="mc-bank-flow__type"><FileText /> PDF افتراضي</span>
      <strong>كشف حساب بنكي</strong>
      <span>01/06 <b dir="ltr">+10,000</b></span>
      <span>02/06 <b dir="ltr">−2,500</b></span>
      <span>03/06 <b dir="ltr">−1,500</b></span>
      <span>04/06 <b dir="ltr">+6,000</b></span>
      <small>رصيد الإقفال · 32,000 EGP</small>
    </div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--review">
      <span className="mc-bank-flow__type"><Layers3 /> صفوف منظمة</span>
      <strong>مراجعة الحركات</strong>
      <span><CircleCheck /> حركتان متطابقتان</span>
      <span>01 بحاجة للمراجعة</span>
      <span>01 تحقق من التكرار</span>
      <small>اعتماد بشري قبل أي ترحيل</small>
    </div>
    <span className="mc-bank-flow__connector" aria-hidden="true"><ArrowLeft /></span>
    <div className="mc-bank-flow__sheet mc-bank-flow__sheet--excel">
      <span className="mc-bank-flow__type"><FileSpreadsheet /> Excel توضيحي</span>
      <strong>مقتطف بيانات قابل للفحص</strong>
      <span><i>التاريخ</i><i>البيان</i><i>الرصيد</i></span>
      <span><i>01/06</i><i>تحصيل</i><i>30,000</i></span>
      <span><i>04/06</i><i>إيراد</i><i>32,000</i></span>
      <small>المعالجة غير مفعّلة حاليًا</small>
    </div>
  </div>;
}

export function IndustrialCutaway({ selected = null, compact = false }: { selected?: FactoryCost | null; compact?: boolean }) {
  return <div className={`mc-industrial-scene ${compact ? "mc-industrial-scene--compact" : ""}`} role="img" aria-label="رسم صناعي توضيحي يربط مخزن الخامات بخط الإنتاج والمنتج النهائي وتكاليف التصنيع">
    <svg viewBox="0 0 650 335" aria-hidden="true">
      <defs>
        <linearGradient id="mc-floor" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f3f7f8" /><stop offset="1" stopColor="#c7d8df" /></linearGradient>
        <linearGradient id="mc-wall" x1="0" x2="1"><stop stopColor="#f7faf9" /><stop offset="1" stopColor="#b8ccd3" /></linearGradient>
      </defs>
      <ellipse className="mc-industrial-scene__shadow" cx="327" cy="283" rx="270" ry="35" />
      <path className="mc-industrial-scene__floor" d="M43 200 288 78 611 181 365 306Z" />
      <path className="mc-industrial-scene__floor-line" d="m91 214 244-123m-184 143 243-123m-181 146 243-123m-182 146 244-123M101 171l329 102m-258-137 330 101m-261-135 330 101" />
      <g className={`mc-industrial-scene__zone mc-industrial-scene__zone--materials ${selected === "materials" ? "is-active" : ""}`}>
        <path className="mc-industrial-scene__side" d="M93 151 189 183v78l-96-32Z" />
        <path className="mc-industrial-scene__front" d="m189 183 101-49v78l-101 49Z" />
        <path className="mc-industrial-scene__top" d="m93 151 101-48 96 31-101 49Z" />
        <path className="mc-industrial-scene__detail" d="m112 170 45 15m-45 8 45 15m-45 8 45 15m49-36 54-26m-54 48 54-26" />
        <path className="mc-industrial-scene__crate" d="m132 130 38-18 38 12-38 18Zm0 0v24l38 13v-25m38-18v24l-38 19" />
      </g>
      <g className={`mc-industrial-scene__zone mc-industrial-scene__zone--labor ${selected === "labor" ? "is-active" : ""}`}>
        <path className="mc-industrial-scene__side" d="m280 159 94 31v70l-94-31Z" />
        <path className="mc-industrial-scene__front" d="m374 190 101-50v70l-101 50Z" />
        <path className="mc-industrial-scene__top" d="m280 159 102-50 93 31-101 50Z" />
        <path className="mc-industrial-scene__machine" d="m322 153 47-23 53 17-47 23Zm6 5v24l45 15 42-21v-24m-65-9v34m29-45v34m-67 18 56 18m17-3 45-22" />
        <circle className="mc-industrial-scene__hub" cx="382" cy="164" r="8" />
      </g>
      <g className={`mc-industrial-scene__zone mc-industrial-scene__zone--overhead ${selected === "overhead" ? "is-active" : ""}`}>
        <path className="mc-industrial-scene__side" d="m482 170 60 20v55l-60-20Z" />
        <path className="mc-industrial-scene__front" d="m542 190 48-24v55l-48 24Z" />
        <path className="mc-industrial-scene__top" d="m482 170 47-24 61 20-48 24Z" />
        <path className="mc-industrial-scene__detail" d="m500 189 28 9m-28 13 28 9m26-18 25-13m-25 35 25-13" />
        <path className="mc-industrial-scene__chimney" d="M500 148v-33l16-8v41m22-8v-43l16-8v43" />
      </g>
      <path className="mc-industrial-scene__route" d="m209 91 65-30 115 37 85-43 85 27" />
      <circle className="mc-industrial-scene__node" cx="209" cy="91" r="5" /><circle className="mc-industrial-scene__node" cx="389" cy="98" r="5" /><circle className="mc-industrial-scene__node" cx="559" cy="82" r="5" />
      <path className="mc-industrial-scene__output" d="m592 155 26-13m-10-3 10 3-1 10" />
    </svg>
    <div className="mc-industrial-scene__labels" aria-hidden="true"><span className={selected === "overhead" ? "is-active" : ""}>التكاليف الصناعية <b>40,000</b></span><span className={selected === "labor" ? "is-active" : ""}>الإنتاج والأجور <b>60,000</b></span><span className={selected === "materials" ? "is-active" : ""}>الخامات <b>120,000</b></span></div>
    {!compact && <div className="mc-industrial-scene__caption"><Landmark /> مسار توضيحي من الخامات إلى المنتج النهائي</div>}
  </div>;
}
