"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChartPermissionOptions } from "@/components/accounting/chart-permission-options";

type Member = { id: string; userId: string; displayName: string; role: string; status: string; permissions: string[] };

export function ChartTeamAccess({ organizationId, currentUserId, members }: { organizationId: string; currentUserId: string; members: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, memberId: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/organizations/${organizationId}/memberships/${memberId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "SET_CHART_PERMISSIONS", permissions: form.getAll("chartPermissions").map(String) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذّر حفظ الصلاحيات.");
      setMessage("حُفظت صلاحيات دليل الحسابات وسُجل التغيير."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذّر حفظ الصلاحيات."); }
    finally { setBusy(false); }
  }

  return <section dir="rtl" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">صلاحيات فريق المحاسبة</h2><p className="mt-1 text-sm text-slate-600">اختر صلاحيات الدليل لكل عضو. لا يستطيع المشاهد أو المراجع إجراء تعديلات، ولا يجوز منح صلاحية لا يملكها المسؤول.</p>{message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{members.filter(member => member.userId !== currentUserId && !member.role.endsWith("_OWNER") && member.status === "ACTIVE").map(member => <form key={member.id} onSubmit={event => void save(event, member.id)} className="rounded-xl border border-slate-200 p-4"><div className="mb-3"><strong>{member.displayName}</strong><p className="text-xs text-slate-500">{member.role.replaceAll("_", " ")}</p></div><ChartPermissionOptions title="تحديد صلاحيات هذا العضو" selected={member.permissions}/><button disabled={busy} className="btn-secondary mt-3">حفظ الصلاحيات</button></form>)}</div>{members.every(member => member.userId === currentUserId || member.role.endsWith("_OWNER") || member.status !== "ACTIVE") && <p className="mt-4 text-sm text-slate-500">لا يوجد أعضاء آخرون نشطون لإعداد صلاحياتهم.</p>}</section>;
}
