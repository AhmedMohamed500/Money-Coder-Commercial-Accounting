const options = [
  ["accounting:chart:view", "عرض دليل الحسابات"],
  ["accounting:chart:create", "إنشاء حسابات"],
  ["accounting:chart:edit", "تعديل الحسابات"],
  ["accounting:chart:deactivate", "طلب التعطيل"],
  ["accounting:chart:delete", "طلب الحذف"],
  ["accounting:chart:template:initialize", "تهيئة قالب جديد"],
  ["accounting:chart:audit:view", "عرض سجل التدقيق"],
  ["accounting:chart:approve", "اعتماد التغييرات الحساسة"],
] as const;

export function ChartPermissionOptions({ title, selected = [] }: { title: string; selected?: string[] }) {
  return <details className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm"><summary className="cursor-pointer font-bold text-teal-900">{title}</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{options.map(([permission, label]) => <label key={permission} className="flex items-center gap-2"><input type="checkbox" name="chartPermissions" value={permission} defaultChecked={selected.includes(permission)}/>{label}</label>)}</div><p className="mt-2 text-xs text-slate-600">تُطبق الصلاحيات المختارة فقط إذا سمحت بها عضوية الموظف والتفويض النشط. الاعتماد يتطلب شخصًا آخر.</p></details>;
}
