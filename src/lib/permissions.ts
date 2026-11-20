import type { MembershipRole, OrganizationType } from "@prisma/client";

const FOUNDATION_PERMISSIONS = [
  "organization:view",
  "organization:edit",
  "documents:view",
  "documents:manage",
  "members:view",
  "members:manage",
  "engagements:view",
  "engagements:manage",
  "audit:view",
] as const;

export const CHART_PERMISSIONS = [
  "accounting:chart:view",
  "accounting:chart:create",
  "accounting:chart:edit",
  "accounting:chart:deactivate",
  "accounting:chart:delete",
  "accounting:chart:template:initialize",
  "accounting:chart:audit:view",
  "accounting:chart:approve",
] as const;

export const PERMISSIONS = [...FOUNDATION_PERMISSIONS, ...CHART_PERMISSIONS] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  OFFICE_OWNER: [...PERMISSIONS],
  OFFICE_MANAGER: [...FOUNDATION_PERMISSIONS, "accounting:chart:view", "accounting:chart:audit:view"],
  OFFICE_ACCOUNTANT: ["organization:view", "organization:edit", "documents:view", "documents:manage", "engagements:view", "accounting:chart:view"],
  COMPANY_OWNER: [...PERMISSIONS],
  COMPANY_MANAGER: [...FOUNDATION_PERMISSIONS, "accounting:chart:view", "accounting:chart:audit:view"],
  COMPANY_ACCOUNTANT: ["organization:view", "organization:edit", "documents:view", "documents:manage", "members:view", "engagements:view", "accounting:chart:view"],
  REVIEWER: ["organization:view", "documents:view", "audit:view", "accounting:chart:view", "accounting:chart:audit:view"],
  VIEWER: ["organization:view", "documents:view", "accounting:chart:view"],
};

const OWNER_ROLES = new Set<MembershipRole>(["OFFICE_OWNER", "COMPANY_OWNER"]);
const MANAGER_ROLES = new Set<MembershipRole>(["OFFICE_MANAGER", "COMPANY_MANAGER"]);

export function defaultOwnerRole(type: OrganizationType): MembershipRole {
  return type === "ACCOUNTING_OFFICE" ? "OFFICE_OWNER" : "COMPANY_OWNER";
}

export function roleHasPermission(role: MembershipRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleMayHoldPermission(role: MembershipRole, permission: Permission) {
  if (!permission.startsWith("accounting:chart:")) return true;
  if (role === "VIEWER") return permission === "accounting:chart:view";
  if (role === "REVIEWER") return permission === "accounting:chart:view" || permission === "accounting:chart:audit:view";
  return true;
}

export function mergePermissions(role: MembershipRole, overrides: unknown): Permission[] {
  const validOverrides = Array.isArray(overrides)
    ? overrides.filter((value): value is Permission => PERMISSIONS.includes(value as Permission) && roleMayHoldPermission(role, value as Permission))
    : [];
  return Array.from(new Set([...ROLE_PERMISSIONS[role], ...validOverrides]));
}

export function isOwnerRole(role: MembershipRole) {
  return OWNER_ROLES.has(role);
}

export function roleMatchesOrganization(role: MembershipRole, type: OrganizationType) {
  if (role === "REVIEWER" || role === "VIEWER") return true;
  return type === "ACCOUNTING_OFFICE" ? role.startsWith("OFFICE_") : role.startsWith("COMPANY_");
}

export function canManageMembership(actorRole: MembershipRole, targetRole: MembershipRole, nextRole?: MembershipRole) {
  if (isOwnerRole(targetRole) || (nextRole && isOwnerRole(nextRole))) return false;
  if (isOwnerRole(actorRole)) return true;
  if (!MANAGER_ROLES.has(actorRole)) return false;
  return !MANAGER_ROLES.has(targetRole) && (!nextRole || !MANAGER_ROLES.has(nextRole));
}

export function validPermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Permission => PERMISSIONS.includes(item as Permission));
}

export function intersectPermissions(first: unknown, second: unknown): Permission[] {
  const allowed = new Set(validPermissions(second));
  return validPermissions(first).filter((permission) => allowed.has(permission));
}
