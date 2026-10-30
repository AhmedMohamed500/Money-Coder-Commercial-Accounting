import { Building2, Home, Landmark, ShieldCheck, Users } from "lucide-react";

export function PremiumMobileMockup() {
  return (
    <div className="mc-phone" dir="rtl" role="img" aria-label="معاينة توضيحية لهاتف يعرض ملف الشركة والفريق">
      <span className="mc-phone__camera" aria-hidden="true" />
      <div className="mc-phone__screen">
        <div className="mc-phone__top">
          <span className="mc-phone__monogram">M</span>
          <span>Money Coder</span>
        </div>
        <div className="mc-phone__greeting">
          <small>مساحة الشركة</small>
          <strong>شركة المثال التجارية</strong>
        </div>
        <div className="mc-phone__balance">
          <small>ملف الشركة · معاينة</small>
          <strong>بيانات منظمة</strong>
          <p>تجارية · الجنيه المصري</p>
        </div>
        <div className="mc-phone__summary">
          <div><span><Landmark /></span><small>الحسابات</small><b>مسجلة</b></div>
          <div><span><Users /></span><small>الفريق</small><b>أدوار واضحة</b></div>
        </div>
        <div className="mc-phone__activity"><strong>وصول المكتب</strong><span><ShieldCheck /> بعد موافقة الشركة</span></div>
        <div className="mc-phone__bottom" aria-hidden="true"><Home /><Building2 /><Users /></div>
      </div>
    </div>
  );
}
