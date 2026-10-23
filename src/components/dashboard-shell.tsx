import Link from "next/link";
import { Building2, Home, Landmark, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import type { Organization, OrganizationMembership, User } from "@prisma/client";

type MemberWithOrg = OrganizationMembership & { organization: Organization };

export function DashboardShell({ user, children }: { user: User & { memberships: MemberWithOrg[] }; children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f4f9fc] lg:grid lg:grid-cols-[280px_1fr]">
    <aside className="border-l border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:h-screen">
      <Brand compact />
      <nav className="mt-8 grid gap-2"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 font-bold text-blue-800"><Home className="h-5 w-5"/> نظرة عامة</Link>
        <p className="muted mt-5 px-3 text-xs font-black">الكيانات</p>
        {user.memberships.map(m => <Link key={m.id} href={m.organization.type === "ACCOUNTING_OFFICE" ? `/office/${m.organizationId}` : `/company/${m.organizationId}`} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold hover:bg-slate-50">{m.organization.type === "ACCOUNTING_OFFICE" ? <Landmark className="h-5 w-5 text-blue-600"/> : <Building2 className="h-5 w-5 text-teal-600"/>}<span className="truncate">{m.organization.tradeName || m.organization.legalName}</span></Link>)}
      </nav>
      <div className="mt-8 border-t border-slate-100 pt-5"><p className="truncate text-sm font-black">{user.displayName}</p><p className="muted truncate text-xs">{user.email}</p><form action="/api/auth/logout" method="post"><button className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4"/> تسجيل الخروج</button></form></div>
    </aside>
    <main className="min-w-0 p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-6xl">{children}</div></main>
  </div>;
}

export function StatusPill({ complete }: { complete: boolean }) { return <span className={`badge ${complete ? "!bg-emerald-100 !text-emerald-800" : "!bg-amber-100 !text-amber-800"}`}>{complete ? <><ShieldCheck className="ml-1 h-3 w-3"/> مكتمل</> : <><Settings className="ml-1 h-3 w-3"/> مسودة</>}</span>; }
