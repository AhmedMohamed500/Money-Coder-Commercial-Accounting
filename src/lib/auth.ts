import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security";
import type { Permission } from "@/lib/permissions";
import { intersectPermissions, mergePermissions } from "@/lib/permissions";

const COOKIE_NAME = "money_coder_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  store.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "ACTIVE", deletedAt: null, organization: { deletedAt: null } },
            include: { organization: true },
          },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.deletedAt) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function authorizeOrganization(userId: string, organizationId: string, permission: Permission) {
  const membership = await db.organizationMembership.findFirst({
    where: { userId, organizationId, status: "ACTIVE", deletedAt: null, organization: { deletedAt: null } },
  });
  if (membership && mergePermissions(membership.role, membership.permissions).includes(permission)) return membership;

  const assignments = await db.engagementStaff.findMany({
    where: {
      userId,
      engagement: { companyOrganizationId: organizationId, status: "ACTIVE", revokedAt: null, company: { deletedAt: null } },
      membership: {
        userId,
        status: "ACTIVE",
        deletedAt: null,
        organization: { deletedAt: null },
      },
    },
    include: { membership: true, engagement: { select: { officeOrganizationId: true, permissions: true } } },
  });
  for (const assignment of assignments) {
    if (assignment.membership.organizationId !== assignment.engagement.officeOrganizationId) continue;
    const allowed = intersectPermissions(assignment.permissions, assignment.engagement.permissions);
    if (allowed.includes(permission)) return assignment.membership;
  }
  return null;
}
