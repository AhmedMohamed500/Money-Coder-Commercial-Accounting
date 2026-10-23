import { describe, expect, it } from "vitest";
import { mergePermissions, roleHasPermission } from "@/lib/permissions";
import { bankAccountSchema, registerSchema } from "@/lib/schemas";

describe("role permissions", () => {
  it("does not allow a viewer to edit an organization", () => {
    expect(roleHasPermission("VIEWER", "organization:edit")).toBe(false);
    expect(roleHasPermission("VIEWER", "organization:view")).toBe(true);
  });
  it("filters invalid permission overrides", () => {
    expect(mergePermissions("VIEWER", ["audit:view", "system:admin"])).toContain("audit:view");
    expect(mergePermissions("VIEWER", ["system:admin"])).not.toContain("system:admin");
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
