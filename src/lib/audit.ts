import { db } from "@/lib/db";

export async function writeAudit(input: {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  request?: Request;
}) {
  await db.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: input.request?.headers.get("user-agent"),
    },
  });
}
