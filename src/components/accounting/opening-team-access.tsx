"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; userId: string; displayName: string; role: string; permissions: string[] };
const options = [
  ["accounting:opening:view", "عرض الأرصدة"], ["accounting:opening:create", "إنشاء مسودة"],
  ["accounting:opening:edit", "تعديل المسودة"], ["accounting:opening:import", "استيراد Excel"],
  ["accounting:opening:submit", "تقديم للمراجعة"], ["accounting:opening:review", "المراجعة أو الرفض"],
  ["accounting:opening:approve", "الاعتماد النهائي"], ["accounting:opening:audit:view", "عرض سجل التدقيق"],
] as const;

export function OpeningTeamAccess({ organizationId, currentUserId, members }: { organizationId: string; currentUserId: string; members: Member[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  async function send(url: string, payload: unknown) {
    setBusy(true); setMessage(""); setError(""); setDevLink("");
    try {
      const response = await fetch(url, { method: url.endsWith("/invitations") ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ إعدادات الفريق.");
      setMessage("تم حفظ إعدادات الفريق.");
      if (body.devInvitationUrl) setDevLink(body.devInvitationUrl);
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "تعذر إتمام الإجراء."); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>, memberId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send(`/api/organizations/${organizationId}/memberships/${memberId}`, { action: "SET_OPENING_PERMISSIONS", permissions: form.getAll("permission").map(String) });
  }
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send(`/api/organizations/${organizationId}/invitations`, { email: String(form.get("email") || ""), role: "REVIEWER" });
  }
  const editableMembers = members.filter(member => member.userId !== currentUserId && !member.role.endsWith("_OWNER"));
  return <section id="opening-team-access" dir="rtl" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <h2 className="text-xl font-black">تعيين مراجع مستقل</h2>
    <p className="mt-1 text-sm text-slate-600">لا يستطيع مُعدّ الدفعة مراجعتها أو اعتمادها بنفسه. أضف عضوًا آخر، وحدد له صلاحيات الأرصدة، ثم يقدمها المحاسب للمراجعة.</p>
    {message && <p role="status" className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{message}{devLink && <a className="mr-2 underline" href={devLink}>رابط الدعوة المحلي</a>}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <form onSubmit={invite} className="rounded-xl border border-slate-200 p-4"><h3 className="font-black">دعوة مراجع جديد</h3><label className="mt-3 flex flex-col gap-1 text-sm font-bold">البريد الإلكتروني<input name="email" type="email" required className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><button disabled={busy} className="mt-3 min-h-10 rounded-xl bg-[#0A5960] px-4 text-sm font-bold text-white disabled:opacity-50">إرسال الدعوة</button><p className="mt-2 text-xs text-slate-600">إرسال الدعوات في الإنتاج يتطلب بريدًا مهيأ. لن تتجاوز الواجهة سياسة البريد.</p></form>
      <div className="space-y-3">{editableMembers.map(member => <form key={member.id} onSubmit={event => save(event, member.id)} className="rounded-xl border border-slate-200 p-4"><strong>{member.displayName}</strong><p className="text-xs text-slate-500">{member.role.replaceAll("_", " ")}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{options.map(([permission, label]) => <label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" name="permission" value={permission} defaultChecked={member.permissions.includes(permission)}/>{label}</label>)}</div><button disabled={busy} className="mt-3 min-h-10 rounded-xl border border-teal-700 px-4 text-sm font-bold text-teal-900 disabled:opacity-50">حفظ صلاحيات الأرصدة</button></form>)}{!editableMembers.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">لا يوجد عضو آخر نشط بعد. استخدم الدعوة لإضافة مراجع.</p>}</div>
    </div>
  </section>;
}
