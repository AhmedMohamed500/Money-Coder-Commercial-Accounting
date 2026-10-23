import { Brand } from "@/components/brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,#d9fff5,transparent_30%),radial-gradient(circle_at_10%_90%,#deefff,transparent_30%)] px-4 py-10"><div className="mx-auto max-w-xl"><div className="mb-7 flex justify-center"><Brand /></div><section className="surface rounded-[30px] p-7 sm:p-10"><h1 className="text-3xl font-black">{title}</h1><p className="muted mb-8 mt-3 leading-7">{subtitle}</p>{children}</section></div></main>;
}
