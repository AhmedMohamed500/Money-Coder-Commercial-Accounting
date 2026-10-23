import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { membershipActionSchema } from "@/lib/schemas";
import { canManageMembership, mergePermissions, roleMatchesOrganization } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const user = await getSessionUser();
  const { id, membershipId } = await params;
  if (!user) return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });

  const [actor, target] = await Promise.all([
    db.organizationMembership.findFirst({ where: { userId: user.id, organizationId: id, status: "ACTIVE", deletedAt: null }, include: { organization: true } }),
    db.organizationMembership.findFirst({ where: { id: membershipId, organizationId: id, deletedAt: null } }),
  ]);
  if (!actor || !mergePermissions(actor.role, actor.permissions).includes("members:manage")) return NextResponse.json({ error: "غير مصرح بإدارة الفريق." }, { status: 403 });
  if (!target) return NextResponse.json({ error: "العضوية غير موجودة." }, { status: 404 });
  if (target.userId === user.id) return NextResponse.json({ error: "لا يمكنك تعديل عضويتك من هذا المسار." }, { status: 400 });

  const parsed = membershipActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "إجراء العضوية غير صالح." }, { status: 400 });
  const nextRole = parsed.data.action === "CHANGE_ROLE" ? parsed.data.role : undefined;
  if (!canManageMembership(actor.role, target.role, nextRole)) return NextResponse.json({ error: "لا يمكن تعديل مالك الكيان أو عضو بصلاحية مساوية." }, { status: 403 });
  if (nextRole && !roleMatchesOrganization(nextRole, actor.organization.type)) return NextResponse.json({ error: "الدور لا يناسب نوع الكيان." }, { status: 400 });

  const updated = await db.$transaction(async (tx) => {
    const data = parsed.data.action === "CHANGE_ROLE"
      ? { role: parsed.data.role }
      : parsed.data.action === "ACTIVATE"
        ? { status: "ACTIVE" as const }
        : parsed.data.action === "SUSPEND"
          ? { status: "SUSPENDED" as const }
          : { status: "SUSPENDED" as const, deletedAt: new Date() };
    const membership = await tx.organizationMembership.update({ where: { id: target.id }, data });
    if (parsed.data.action === "SUSPEND" || parsed.data.action === "REVOKE") {
      await tx.engagementStaff.deleteMany({ where: { membershipId: target.id } });
    }
    await tx.auditEvent.create({ data: { organizationId: id, actorUserId: user.id, action: `MEMBERSHIP_${parsed.data.action}`, entityType: "OrganizationMembership", entityId: target.id, metadata: nextRole ? { nextRole } : {} } });
    return membership;
  });
  return NextResponse.json(updated);
}
