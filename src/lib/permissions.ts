import type { MembershipRole, OrganizationType } from "@prisma/client";

export const PERMISSIONS = [
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

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  OFFICE_OWNER: [...PERMISSIONS],
  OFFICE_MANAGER: [...PERMISSIONS],
  OFFICE_ACCOUNTANT: ["organization:view", "organization:edit", "documents:view", "documents:manage", "engagements:view"],
  COMPANY_OWNER: [...PERMISSIONS],
  COMPANY_MANAGER: [...PERMISSIONS],
  COMPANY_ACCOUNTANT: ["organization:view", "organization:edit", "documents:view", "documents:manage", "members:view", "engagements:view"],
  REVIEWER: ["organization:view", "documents:view", "audit:view"],
  VIEWER: ["organization:view", "documents:view"],
};

export function defaultOwnerRole(type: OrganizationType): MembershipRole {
  return type === "ACCOUNTING_OFFICE" ? "OFFICE_OWNER" : "COMPANY_OWNER";
}

export function roleHasPermission(role: MembershipRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function mergePermissions(role: MembershipRole, overrides: unknown): Permission[] {
  const validOverrides = Array.isArray(overrides)
    ? overrides.filter((value): value is Permission => PERMISSIONS.includes(value as Permission))
    : [];
  return Array.from(new Set([...ROLE_PERMISSIONS[role], ...validOverrides]));
}
