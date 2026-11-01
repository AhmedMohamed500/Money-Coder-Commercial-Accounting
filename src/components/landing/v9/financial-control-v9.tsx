"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, Check, ChevronLeft, ChevronRight, Menu, Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
import { CommandCenter, type CommandView } from "./command-center";
import { MoneyTrail } from "./money-trail";
import { BankStatementDemo } from "./bank-statement";
import { PocketCfo } from "./pocket-cfo";
import { DecisionLab } from "./decision-lab";
import { IndustryExperience } from "./industry";
import { FoundationStrip, LandingQuestions, TeamInFocus } from "./rich-content";
import { personas, sectors, type Persona, type Sector } from "./demo-data";
import "./v9.css";
import "./v9-experiences.css";
import "./v9-showcases.css";
import "./v9-responsive.css";
import "./v9-content.css";
import "./v9-global.css";
import "./v12.css";

const tourStops = [
  { label: "اختار سياق شغلك", target: "business-dna" },
  { label: "افتح مركز التحكم", target: "command-center" },
  { label: "افحص حركة بنك", target: "money-trail" },
  { label: "اتبع أثر الحركة", target: "money-trail" },
  { label: "شوف الكشف المنظّم", target: "bank-statement" },
  { label: "انتقل لمركز الموبايل", target: "pocket-cfo" },
  { label: "جرّب قرارًا ماليًا", target: "decision-lab" },
] as const;

function Brand() {
  return <Link href="/" className="mc9-brand" aria-label="Money Coder — الصفحة الرئيسية"><Image src="/landing/money-coder-mark-v6-1.png" alt="" width={42} height={42} /><span><strong>Money Coder</strong><small>SMART ACCOUNTING</small></span></Link>;
}

function Header({ signedIn, startHref, onTour }: { signedIn: boolean; startHref: string; onTour: () => void }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menu.current?.removeAttribute("open");
  return <header className="mc9-header"><div className="mc9-wrap mc9-header-inner"><Brand /><nav className="mc9-header-links" aria-label="التنقل الرئيسي"><Link href="#command-center">المنصة</Link><Link href="#money-trail">رحلة الحركة</Link><Link href="#bank-statement">كشف البنك</Link><Link href="#decision-lab">مختبر القرار</Link></nav><div className="mc9-header-actions"><button type="button" className="mc9-tour-link" onClick={onTour}>جرّب Money Coder في دقيقة</button><Link href={signedIn ? "/dashboard" : "/auth/login"} className="mc9-login">{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link href={startHref} className="mc9-button mc9-button-gold">{signedIn ? "افتح شركتك" : "ابدأ الآن"}<ArrowLeft size={17} /></Link></div><details className="mc9-mobile-menu" ref={menu}><summary aria-label="فتح القائمة"><Menu size={22} /></summary><nav aria-label="قائمة الموبايل"><Link href="#business-dna" onClick={closeMenu}>اختار سياقك</Link><Link href="#what-is-ready" onClick={closeMenu}>المتاح الآن</Link><Link href="#command-center" onClick={closeMenu}>المنصة</Link><Link href="#money-trail" onClick={closeMenu}>رحلة الحركة</Link><Link href="#bank-statement" onClick={closeMenu}>كشف البنك</Link><Link href="#pocket-cfo" onClick={closeMenu}>مركز الموبايل</Link><Link href="#decision-lab" onClick={closeMenu}>مختبر القرار</Link><Link href="#questions" onClick={closeMenu}>أسئلة شائعة</Link><button type="button" onClick={() => { closeMenu(); onTour(); }}>ابدأ الجولة التفاعلية</button><Link href={signedIn ? "/dashboard" : "/auth/login"} onClick={closeMenu}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link href={startHref} onClick={closeMenu}>{signedIn ? "افتح شركتك" : "أنشئ حسابًا"}</Link></nav></details></div></header>;
}

function Hero({ startHref, onTour }: { startHref: string; onTour: () => void }) {
  const [motion, setMotion] = useState<"run" | "pause" | "skip">("run");
  const [runKey, setRunKey] = useState(0);
  const replay = () => { setRunKey(value => value + 1); setMotion("run"); };
  return <section id="hero" className="mc9-hero" aria-labelledby="mc9-hero-title" data-motion={motion}><div className="mc9-hero-ambient" aria-hidden="true" /><div className="mc9-wrap mc9-hero-grid" key={runKey}><div className="mc9-hero-copy"><span className="mc9-overline mc9-hero-overline"><i /> MONEY CODER / مساحة عمل لشركتك</span><h1 id="mc9-hero-title"><span>شركتك مرتّبة.</span><span>كل دور واضح.</span><em>والصورة قدامك.</em></h1><p>نظّم ملف شركتك، حساباتها المسجلة، وأدوار فريقك في مساحة واحدة. ثم استكشف بمعاينة توضيحية كيف تتحول البيانات المالية إلى قرار مفهوم.</p><div className="mc9-hero-actions"><Link className="mc9-button mc9-button-teal" href={startHref}>ابدأ مع Money Coder <ArrowLeft size={18} /></Link><button type="button" className="mc9-button mc9-button-outline" onClick={onTour}>جرّب المنصة <ArrowUpLeft size={18} /></button></div><div className="mc9-hero-honesty"><Check size={16} /> الوظائف المالية المعروضة في الجولة نماذج توضيحية، وليست أرصدة بنكية حية.</div></div><div className="mc9-hero-visual"><div className="mc9-hero-scene"><div className="mc9-hero-scene-image"><Image src="/landing/team-hero-v12.webp" alt="فريق أعمال يناقش بيانات الشركة حول حاسوب في اجتماع، مشهد توضيحي" fill priority sizes="(max-width: 850px) 100vw, 55vw" /></div><span className="mc9-hero-scene-label">مشهد توضيحي</span><div className="mc9-hero-work-card" aria-label="معاينة توضيحية لمساحة الشركة"><div className="mc9-hero-work-top"><span className="mc9-desktop-mark">M</span><strong>Money Coder</strong><small>مساحة الشركة</small></div><div className="mc9-hero-work-body"><span>شركة الأفق التجارية · بيانات افتراضية</span><strong>الفريق على نفس الصفحة.</strong><div className="mc9-hero-work-list"><span><Check size={15} /> ملف الشركة واضح</span><span><Check size={15} /> الحسابات مسجّلة</span><span><Check size={15} /> الأدوار والصلاحيات محددة</span></div></div></div></div></div></div><div className="mc9-wrap mc9-hero-bottom"><nav className="mc9-hero-path" aria-label="روابط سريعة داخل الصفحة"><span>ابدأ من الجزء اللي يهمك:</span><a href="#what-is-ready">المتاح الآن</a><a href="#team-in-focus">فريقك وصلاحياته</a><a href="#money-trail">رحلة مالية توضيحية</a></nav><div className="mc9-motion-controls" aria-label="التحكم في حركة المقدمة"><button type="button" onClick={() => setMotion(value => value === "pause" ? "run" : "pause")} aria-label={motion === "pause" ? "استكمال الحركة" : "إيقاف الحركة مؤقتًا"}>{motion === "pause" ? <Play size={15} /> : <Pause size={15} />}</button><button type="button" onClick={replay} aria-label="إعادة حركة المقدمة"><RotateCcw size={15} /></button><button type="button" onClick={() => setMotion("skip")} aria-label="تجاوز حركة المقدمة"><SkipForward size={15} /></button></div></div></section>;
}

function BusinessDna({ persona, sector, onPersona, onSector, onExplore }: { persona: Persona; sector: Sector; onPersona: (value: Persona) => void; onSector: (value: Sector) => void; onExplore: () => void }) {
  const selectedPersona = personas.find(item => item.id === persona)!;
  const selectedSector = sectors[sector];
  return <section id="business-dna" className="mc9-dna mc9-section" aria-labelledby="mc9-dna-title"><div className="mc9-wrap mc9-dna-layout"><div className="mc9-dna-copy"><span className="mc9-overline">01 / سياقك يغيّر التجربة</span><h2 id="mc9-dna-title">ابدأ من شغلك.<br /><em>مش من قالب جاهز.</em></h2><p>اختار دورك وطبيعة شركتك. هتتغير البيانات والأسئلة والواجهة اللي تستكشفها، من غير حساب أو حفظ معلومات.</p><div className="mc9-choice-group" role="group" aria-label="اختار دورك"><strong>أنا...</strong><div>{personas.map(item => <button type="button" key={item.id} aria-pressed={persona === item.id} onClick={() => onPersona(item.id)}>{item.label}</button>)}</div></div><div className="mc9-choice-group" role="group" aria-label="اختار نوع النشاط"><strong>وشغلي...</strong><div>{(Object.keys(sectors) as Sector[]).map(id => <button type="button" key={id} aria-pressed={sector === id} onClick={() => onSector(id)}>{sectors[id].label}</button>)}</div></div><button type="button" className="mc9-text-action" onClick={onExplore}>شوف مساحة العمل المناسبة ليك <ArrowLeft size={17} /></button></div><div className="mc9-dna-scene"><Image src={selectedSector.image} alt={selectedSector.imageAlt} fill sizes="(max-width: 850px) 100vw, 48vw" /><div className="mc9-dna-overlay"><small>سياقك المختار / بيانات افتراضية</small><strong>{selectedSector.company}</strong><p>{selectedPersona.question}</p><span>{selectedSector.focus}</span></div></div></div></section>;
}

function ProductTour({ index, onClose, onStep }: { index: number; onClose: () => void; onStep: (value: number) => void }) {
  const stop = tourStops[index];
  return <aside className="mc9-tour" aria-label="الجولة التفاعلية" aria-live="polite"><div className="mc9-tour-head"><span>جولة تفاعلية · بيانات افتراضية</span><button type="button" aria-label="إغلاق الجولة" onClick={onClose}><X size={18} /></button></div><div className="mc9-tour-progress"><span style={{ width: `${(index + 1) / tourStops.length * 100}%` }} /></div><small>الخطوة {index + 1} من {tourStops.length}</small><strong>{stop.label}</strong><p>انتقل بين التجارب بحرية. المدة تختلف حسب وقت استكشافك.</p><div className="mc9-tour-actions"><button type="button" onClick={() => onStep(index - 1)} disabled={index === 0}><ChevronRight size={17} /> السابق</button><button type="button" onClick={() => index === tourStops.length - 1 ? onClose() : onStep(index + 1)}>{index === tourStops.length - 1 ? "إنهاء الجولة" : "التالي"}<ChevronLeft size={17} /></button></div></aside>;
}

function FinalCta({ startHref, signedIn, onTour }: { startHref: string; signedIn: boolean; onTour: () => void }) {
  return <section id="start" className="mc9-final" aria-labelledby="mc9-final-title"><div className="mc9-wrap mc9-final-layout"><div><span className="mc9-overline">MONEY CODER / START</span><h2 id="mc9-final-title">ابدأ بتنظيم شركتك.<br /><em>والقرار هيبقى أوضح.</em></h2><p>اجمع بيانات شركتك وفريقها وصلاحياتهم في مكان واحد. واستكشف الاتجاه المالي القادم من خلال تجارب توضيحية صريحة.</p><div className="mc9-final-actions"><Link href={startHref} className="mc9-button mc9-button-gold">{signedIn ? "افتح شركتك" : "أنشئ حساب شركتك"}<ArrowLeft size={18} /></Link><button type="button" className="mc9-button mc9-button-light" onClick={onTour}>جولة سريعة <ArrowUpLeft size={18} /></button></div></div><div className="mc9-final-signature"><span>من المستند</span><i aria-hidden="true">→</i><strong>إلى القرار.</strong><small>كل رقم له مصدر. وكل قرار يحتاج مراجعة.</small></div></div></section>;
}

export function FinancialControlV9({ signedIn }: { signedIn: boolean }) {
  const [persona, setPersona] = useState<Persona>("owner");
  const [sector, setSector] = useState<Sector>("commercial");
  const [commandView, setCommandView] = useState<CommandView>("overview");
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  const selectPersona = (value: Persona) => { setPersona(value); setCommandView(value === "finance" ? "cash" : value === "office" ? "delegation" : value === "accountant" ? "exceptions" : "overview"); };
  const selectSector = (value: Sector) => { setSector(value); setCommandView(value === "accountingOffice" ? "delegation" : "overview"); };
  const startTour = () => { setTourIndex(0); scrollTo(tourStops[0].target); };
  const tourStep = (value: number) => { if (value < 0 || value >= tourStops.length) return; setTourIndex(value); if (value === 1) setCommandView("overview"); scrollTo(tourStops[value].target); };
  return <div className="mc9" dir="rtl"><Header signedIn={signedIn} startHref={startHref} onTour={startTour} /><main><Hero startHref={startHref} onTour={startTour} /><FoundationStrip /><BusinessDna persona={persona} sector={sector} onPersona={selectPersona} onSector={selectSector} onExplore={() => scrollTo("command-center")} /><TeamInFocus onChooseRole={(role) => { setPersona(role); setCommandView(role === "finance" ? "accounts" : role === "accountant" ? "team" : "overview"); scrollTo("command-center"); }} /><CommandCenter persona={persona} sector={sector} view={commandView} onView={setCommandView} /><MoneyTrail key={tourIndex === 2 || tourIndex === 3 ? `trail-${tourIndex}` : "trail-normal"} tourStage={tourIndex === 2 ? 0 : tourIndex === 3 ? 3 : undefined} /><BankStatementDemo key={tourIndex === 4 ? "bank-tour" : "bank-normal"} tourStage={tourIndex === 4 ? 5 : undefined} /><PocketCfo key={tourIndex === 5 ? "pocket-tour" : "pocket-normal"} sector={sector} tourView={tourIndex === 5 ? "pulse" : undefined} /><DecisionLab key={tourIndex === 6 ? "lab-tour" : "lab-normal"} tourActive={tourIndex === 6} /><IndustryExperience sector={sector} onSector={selectSector} /><section className="mc9-readiness" aria-labelledby="mc9-readiness-title"><div className="mc9-wrap mc9-readiness-layout"><div><span className="mc9-overline">المنتج الحالي / الرؤية القادمة</span><h2 id="mc9-readiness-title">الأساس موجود.<br />والتجربة بتكبر بوضوح.</h2></div><div><p><strong>متاح الآن:</strong> ملف الشركة، الحسابات البنكية المسجلة، أعضاء الفريق، الأدوار والتفويضات.</p><p><strong>معاينات مستقبلية:</strong> معالجة الكشوف، المراجعة المالية، القيود المقترحة، ومحاكاة القرار. كل ذلك ظاهر ببيانات افتراضية فقط.</p><Link href={startHref}>ابدأ بالمتاح الآن <ArrowLeft size={16} /></Link></div></div></section><LandingQuestions /><FinalCta startHref={startHref} signedIn={signedIn} onTour={startTour} /></main><footer className="mc9-footer"><div className="mc9-wrap"><Brand /><nav aria-label="روابط التذييل"><Link href="#business-dna">سياقك</Link><Link href="#what-is-ready">المتاح الآن</Link><Link href="#command-center">المنصة</Link><Link href="#money-trail">رحلة الحركة</Link><Link href="#bank-statement">كشف البنك</Link><Link href="#decision-lab">مختبر القرار</Link><Link href="#questions">أسئلة شائعة</Link><Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link></nav><small>© 2026 Money Coder · واجهات العرض المالي توضيحية</small></div></footer>{tourIndex !== null && <ProductTour index={tourIndex} onClose={() => setTourIndex(null)} onStep={tourStep} />}</div>;
}
