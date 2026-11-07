import { db } from "@/lib/db";
import { openingActor, openingDenied, openingFailure, openingNoStore } from "@/lib/accounting/opening-api";
import { openingTemplate } from "@/lib/accounting/opening-excel";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!await openingActor(id, "accounting:opening:view")) return openingDenied();
  try {
    const accounts = await db.chartAccount.findMany({ where: { organizationId: id, deletedAt: null, isActive: true, isPostable: true }, orderBy: { code: "asc" }, select: { code: true, nameAr: true } });
    const buffer = await openingTemplate(accounts);
    return new Response(new Uint8Array(buffer), { headers: { ...openingNoStore, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=opening-balances-template.xlsx", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return openingFailure(error); }
}
