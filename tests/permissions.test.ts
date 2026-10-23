import { describe, expect, it } from "vitest";
import { canManageMembership, intersectPermissions, mergePermissions, roleHasPermission, roleMatchesOrganization } from "@/lib/permissions";
import { bankAccountSchema, registerSchema } from "@/lib/schemas";
import { onboardingMissingFields } from "@/lib/onboarding";

describe("role permissions", () => {
  it("does not allow a viewer to edit an organization", () => {
    expect(roleHasPermission("VIEWER", "organization:edit")).toBe(false);
    expect(roleHasPermission("VIEWER", "organization:view")).toBe(true);
  });
  it("filters invalid permission overrides", () => {
    expect(mergePermissions("VIEWER", ["audit:view", "system:admin"])).toContain("audit:view");
    expect(mergePermissions("VIEWER", ["system:admin"])).not.toContain("system:admin");
  });
  it("never lets delegated staff exceed the accepted engagement permissions", () => {
    expect(intersectPermissions(["organization:view", "organization:edit"], ["organization:view"])).toEqual(["organization:view"]);
  });
  it("protects owners and equal-level managers from role escalation", () => {
    expect(canManageMembership("OFFICE_MANAGER", "OFFICE_ACCOUNTANT", "VIEWER")).toBe(true);
    expect(canManageMembership("OFFICE_MANAGER", "OFFICE_MANAGER", "VIEWER")).toBe(false);
    expect(canManageMembership("OFFICE_OWNER", "OFFICE_MANAGER", "OFFICE_ACCOUNTANT")).toBe(true);
    expect(canManageMembership("OFFICE_OWNER", "OFFICE_OWNER", "VIEWER")).toBe(false);
    expect(roleMatchesOrganization("COMPANY_MANAGER", "ACCOUNTING_OFFICE")).toBe(false);
  });
});

describe("onboarding completion", () => {
  it("reports the production-critical company fields that are still missing", () => {
    const missing = onboardingMissingFields({ type:"COMMERCIAL_COMPANY", legalName:"Test", profile:null, legalDetails:null, addresses:[], accountingSettings:null, fiscalYears:[], bankAccounts:[] });
    expect(missing).toContain("السنة المالية");
    expect(missing).toContain("حساب بنكي واحد على الأقل");
    expect(missing).toContain("رقم السجل التجاري");
  });
});

describe("input validation", () => {
  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ displayName:"Test User", email:"user@example.com", password:"password", organizationType:"COMMERCIAL_COMPANY", legalName:"Test Co" }).success).toBe(false);
  });
  it("rejects malformed IBAN values", () => {
    expect(bankAccountSchema.safeParse({ bankName:"Bank", accountName:"Main", accountNumber:"12345", iban:"@@ invalid", currency:"EGP", isActive:true }).success).toBe(false);
  });
});
