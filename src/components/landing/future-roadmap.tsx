import { BookOpen, FileSpreadsheet, GitBranch, Landmark, ReceiptText, Scale, ScrollText, Sparkles, Workflow } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const futureModules = [
  [BookOpen, "دليل الحسابات"], [Scale, "الأرصدة الافتتاحية"], [ReceiptText, "الفواتير الإلكترونية"],
  [Landmark, "كشوف البنوك"], [FileSpreadsheet, "مراجعة Excel"], [GitBranch, "القيود اليومية"],
  [ScrollText, "الأستاذ العام"], [Workflow, "ميزان المراجعة"], [Sparkles, "القوائم المالية"],
] as const;

export function FutureRoadmap() {
  return (
    <section className="future-section" id="future">
      <div className="future-glow" aria-hidden="true" />
      <div className="premium-container future-layout">
        <div className="future-copy">
          <SectionHeading inverted eyebrow="الرؤية القادمة" title={<>من تأسيس شركتك…<br/><em>إلى منظومة مالية متكاملة.</em></>} description="نبني الأساس اليوم ليستوعب دورة محاسبية أوسع غدًا، من دون الادعاء بأن الوظائف القادمة متاحة قبل تنفيذها واختبارها." />
          <div className="future-status"><i/><p><strong>خارطة تطوير معلنة بوضوح</strong><span>كل الوحدات المقابلة مخطط لها وليست مفعلة حاليًا.</span></p></div>
        </div>
        <div className="system-map" aria-label="مخطط الوحدات المحاسبية المخطط لها">
          <div className="system-core"><span>MC</span><strong>نواة المؤسسة</strong><small>متاحة الآن</small></div>
          <svg className="system-paths" viewBox="0 0 620 620" aria-hidden="true"><circle cx="310" cy="310" r="170"/><circle cx="310" cy="310" r="260"/><path d="M310 50V570M50 310H570M125 125L495 495M495 125L125 495"/></svg>
          {futureModules.map(([Icon, label], index) => <div className={`system-module system-module--${index + 1}`} key={label}><Icon/><span>{label}</span><small>قريبًا</small></div>)}
        </div>
      </div>
    </section>
  );
}
