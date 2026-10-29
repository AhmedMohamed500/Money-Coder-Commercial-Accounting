import { ArrowDownLeft, ArrowUpRight, FileText, Home, UserRound } from "lucide-react";
import { closingBankBalance, demoTransactions, money, totalCredits, totalDebits } from "./accounting-demo-data";

export function PremiumMobileMockup() {
  return (
    <div className="mc-phone" dir="rtl" role="img" aria-label="معاينة توضيحية لهاتف يعرض رصيدًا وحركة مالية افتراضية">
      <span className="mc-phone__camera" aria-hidden="true" />
      <div className="mc-phone__screen">
        <div className="mc-phone__top">
          <span className="mc-phone__monogram">M</span>
          <span>Money Coder</span>
        </div>
        <div className="mc-phone__greeting">
          <small>شركة المثال التجارية</small>
          <strong>نظرة البنك · يونيو</strong>
        </div>
        <div className="mc-phone__balance">
          <small>رصيد إقفال الكشف · مثال توضيحي</small>
          <strong dir="ltr">{money(closingBankBalance)} <span>EGP</span></strong>
          <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 26 L12 22 L25 24 L38 15 L51 18 L64 9 L77 13 L90 5 L104 9 L120 2" />
          </svg>
        </div>
        <div className="mc-phone__summary">
          <div><span><ArrowDownLeft /></span><small>إيداعات</small><b dir="ltr">{money(totalCredits)}</b></div>
          <div><span><ArrowUpRight /></span><small>مسحوبات</small><b dir="ltr">{money(totalDebits)}</b></div>
        </div>
        <div className="mc-phone__activity"><strong>حركة للمراجعة</strong><span><FileText /> {demoTransactions[2].description} <small dir="ltr">{demoTransactions[2].date}</small></span></div>
        <div className="mc-phone__bottom" aria-hidden="true"><Home /><FileText /><UserRound /></div>
      </div>
    </div>
  );
}
