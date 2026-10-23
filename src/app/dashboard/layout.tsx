import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export default async function Layout({ children }: { children: React.ReactNode }) { const user = await requireUser(); return <DashboardShell user={user}>{children}</DashboardShell>; }
