import { ArrowDownLeft, ArrowUpRight, FileText, Home, UserRound } from "lucide-react";

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
          <small>صباح الخير، أحمد</small>
          <strong>نظرة شركتك المالية</strong>
        </div>
        <div className="mc-phone__balance">
          <small>الرصيد الحالي · مثال توضيحي</small>
          <strong dir="ltr">1,250,000 <span>EGP</span></strong>
          <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 26 L12 22 L25 24 L38 15 L51 18 L64 9 L77 13 L90 5 L104 9 L120 2" />
          </svg>
        </div>
        <div className="mc-phone__summary">
          <div><span><ArrowDownLeft /></span><small>إيرادات</small><b dir="ltr">80,000</b></div>
          <div><span><ArrowUpRight /></span><small>مصروفات</small><b dir="ltr">24,000</b></div>
        </div>
        <div className="mc-phone__activity"><strong>آخر نشاط</strong><span><FileText /> إضافة مستند <small>اليوم</small></span></div>
        <div className="mc-phone__bottom" aria-hidden="true"><Home /><FileText /><UserRound /></div>
      </div>
    </div>
  );
}
