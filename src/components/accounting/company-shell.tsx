"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Building2, ChevronDown, ClipboardList, Home, Landmark, LogOut, Menu, Settings2, ShieldCheck, Workflow, X } from "lucide-react";
import { Brand } from "@/components/brand";
import "./company-shell.css";

type Props = {
  organizationId: string;
  companyName: string;
  userName: string;
  delegated: boolean;
  canChart: boolean;
  canOpening?: boolean;
  canAudit: boolean;
  canManageTeam: boolean;
  canAutomation?: boolean;
  canBankStatements?: boolean;
  activeView?: "audit";
  children: ReactNode;
};

const planned = ["القيود اليومية", "دفتر الأستاذ العام", "ميزان المراجعة", "القوائم المالية", "الإقفال المحاسبي", "العملاء والموردون", "المبيعات والمشتريات", "البنوك والتسوية", "المخزون والتكاليف"];

export function CompanyShell({ organizationId, companyName, userName, delegated, canChart, canOpening = false, canAudit, canManageTeam, canAutomation = false, canBankStatements = false, activeView, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/company/${organizationId}`;
  const chart = `${base}/accounting/chart-of-accounts`;
  const opening = `${base}/accounting/opening-balances`;
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function navLink(href: string, label: string, icon: ReactNode, active: boolean) {
    return <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} style={active ? { color: "#fff" } : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${active ? "bg-[#0A5960]" : "text-slate-700 hover:bg-slate-100"}`}>{icon}<span>{label}</span></Link>;
  }

  const navigation = <>
    <div className="border-b border-slate-200 px-5 py-5"><Brand /><div className="mt-6 rounded-2xl bg-[#102B4C] p-4 text-white"><p className="text-[11px] font-bold text-teal-200">مساحة الشركة {delegated ? "· وصول مفوض" : ""}</p><p className="mt-1 truncate text-base font-black" title={companyName}>{companyName}</p></div></div>
    <nav aria-label="التنقل داخل الشركة" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
      <div><p className="px-3 pb-2 text-xs font-black text-slate-500">الرئيسية</p>{navLink(base, "لوحة الشركة", <Home size={18}/>, pathname === base)}</div>
      <details open className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-xs font-black text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500">النظام المحاسبي<ChevronDown size={15} className="transition-transform group-open:rotate-180"/></summary><div className="space-y-1 pt-1">{canChart ? navLink(chart, "دليل الحسابات", <BookOpen size={18}/>, pathname.startsWith(chart) && activeView !== "audit") : <p className="px-3 py-2 text-xs text-slate-500">دليل الحسابات يتطلب صلاحية عرض.</p>}{canOpening && navLink(opening, "أرصدة أول المدة", <ClipboardList size={18}/>, pathname.startsWith(opening))}{canAudit && navLink(`${chart}?view=audit`, "سجل تعديلات الدليل", <ClipboardList size={18}/>, activeView === "audit")}<details className="rounded-lg px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-slate-500">المراحل القادمة</summary><ul className="mt-2 space-y-1 border-r border-slate-200 pr-3">{planned.map(item => <li key={item} className="py-1 text-xs text-slate-400">{item} <span className="sr-only">غير متاح بعد</span></li>)}</ul></details></div></details>
      {(canBankStatements || canAutomation) && <div><p className="px-3 pb-2 text-xs font-black text-slate-500">العمليات البنكية والأتمتة</p>{canBankStatements && navLink(`${base}/bank-statements`, "كشوف الحساب", <Landmark size={18}/>, pathname.startsWith(`${base}/bank-statements`))}{canAutomation && navLink(`${base}/automation`, "مركز الأتمتة", <Workflow size={18}/>, pathname.startsWith(`${base}/automation`))}<p className="px-3 pt-2 text-xs text-slate-400">التسوية مع الدفاتر غير متاحة بعد.</p></div>}
      <details open className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-xs font-black text-slate-500 focus-visible:outline-2 focus-visible:outline-teal-500">الإدارة<ChevronDown size={15} className="transition-transform group-open:rotate-180"/></summary><div className="space-y-1 pt-1">{navLink(`${base}/settings`, "إعدادات الشركة", <Settings2 size={18}/>, pathname === `${base}/settings`)}{canManageTeam && canChart && navLink(`${chart}#team-access`, "الفريق والصلاحيات", <ShieldCheck size={18}/>, false)}</div></details>
      <div className="border-t border-slate-200 pt-3">{navLink("/dashboard", "كل الكيانات", <Building2 size={18}/>, false)}</div>
    </nav>
    <div className="border-t border-slate-200 px-5 py-4"><p className="truncate text-sm font-bold text-[#102B4C]">{userName}</p><form action="/api/auth/logout" method="post"><button className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-sm font-bold text-red-700 hover:bg-red-50"><LogOut size={16}/> تسجيل الخروج</button></form></div>
  </>;

  return <div dir="rtl" className="company-shell min-h-screen bg-[#F8FAFD] text-[#102B4C] lg:grid lg:grid-cols-[286px_minmax(0,1fr)]">
    <aside className="hidden h-screen flex-col border-l border-slate-200 bg-white lg:sticky lg:top-0 lg:flex">{navigation}</aside>
    <div className="min-w-0"><header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden"><div className="min-w-0"><p className="text-[11px] font-bold text-teal-700">مساحة الشركة</p><p className="truncate text-sm font-black">{companyName}</p></div><button type="button" onClick={() => setOpen(true)} aria-label="فتح قائمة الشركة" aria-expanded={open} aria-controls="company-mobile-nav" className="rounded-xl border border-slate-200 p-2 focus-visible:outline-2 focus-visible:outline-teal-500"><Menu size={22}/></button></header><main className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl">{children}</div></main></div>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق قائمة الشركة" className="absolute inset-0 bg-slate-950/55"/><aside id="company-mobile-nav" className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-2xl"><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="absolute left-4 top-4 z-10 rounded-lg p-2 text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-500"><X size={20}/></button>{navigation}</aside></div>}
  </div>;
}
