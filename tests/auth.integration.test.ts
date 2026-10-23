import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const cookieState = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return {
    jar,
    store: {
      get(name: string) { const value = jar.get(name); return value ? { name, value } : undefined; },
      set(name: string, value: string) { jar.set(name, value); },
      delete(name: string) { jar.delete(name); },
    },
  };
});

vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { getSessionUser } from "@/lib/auth";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as verifyEmail } from "@/app/api/auth/verify/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot/route";
import { POST as resetPassword } from "@/app/api/auth/reset/route";
import { GET as getOrganization, PATCH as updateOrganization } from "@/app/api/organizations/[id]/route";
import { POST as createBankAccount } from "@/app/api/organizations/[id]/bank-accounts/route";
import { GET as downloadDocument } from "@/app/api/documents/[documentId]/route";

const enabled = process.env.RUN_DB_TESTS === "1";
const marker = randomUUID();
const companyEmail = `company-${marker}@test.local`;
const officeEmail = `office-${marker}@test.local`;
const firstPassword = "SecurePass123";
const nextPassword = "NewSecurePass456";
const ids: { users: string[]; organizations: string[] } = { users: [], organizations: [] };
let companyId = "";
let companyVerificationUrl = "";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe.skipIf(!enabled)("authentication and protected API workflow", () => {
  beforeAll(async () => { await db.$connect(); });
  afterAll(async () => {
    cookieState.jar.clear();
    await db.organization.deleteMany({ where: { id: { in: ids.organizations } } });
    await db.user.deleteMany({ where: { id: { in: ids.users } } });
    await db.$disconnect();
  });

  it("registers both a commercial company and an accounting office transactionally", async () => {
    const companyResponse = await register(jsonRequest("http://local.test/api/auth/register", { displayName:"Company Owner", email:companyEmail, password:firstPassword, organizationType:"COMMERCIAL_COMPANY", legalName:"Integration Company", tradeName:"Integration" }));
    expect(companyResponse.status).toBe(201);
    const companyBody = await companyResponse.json();
    companyVerificationUrl = companyBody.devVerificationUrl;
    const companyUser = await db.user.findUniqueOrThrow({ where:{email:companyEmail}, include:{memberships:true} });
    companyId = companyUser.memberships[0].organizationId;
    ids.users.push(companyUser.id); ids.organizations.push(companyId);
    expect(companyUser.memberships[0].role).toBe("COMPANY_OWNER");
    expect(companyUser.emailVerifiedAt).toBeNull();

    const officeResponse = await register(jsonRequest("http://local.test/api/auth/register", { displayName:"Office Owner", email:officeEmail, password:firstPassword, organizationType:"ACCOUNTING_OFFICE", legalName:"Integration Office" }));
    expect(officeResponse.status).toBe(201);
    const officeUser = await db.user.findUniqueOrThrow({ where:{email:officeEmail}, include:{memberships:true} });
    ids.users.push(officeUser.id); ids.organizations.push(officeUser.memberships[0].organizationId);
    expect(officeUser.memberships[0].role).toBe("OFFICE_OWNER");
  });

  it("requires verification, logs in, persists the full company setup, and logs out", async () => {
    const deniedBeforeVerification = await login(jsonRequest("http://local.test/api/auth/login", { email:companyEmail, password:firstPassword }));
    expect(deniedBeforeVerification.status).toBe(403);

    const verification = await verifyEmail(new Request(companyVerificationUrl));
    expect(verification.headers.get("location")).toContain("status=ok");
    const loginResponse = await login(jsonRequest("http://local.test/api/auth/login", { email:companyEmail, password:firstPassword }));
    expect(loginResponse.status).toBe(200);
    expect(cookieState.jar.get("money_coder_session")).toBeTruthy();

    const update = await updateOrganization(new Request(`http://local.test/api/organizations/${companyId}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({ legalName:"Integration Company Updated", tradeName:"Integration", profile:{responsiblePerson:"Company Owner",businessActivity:"Wholesale",phone:"01000000000"}, legal:{commercialRegisterNo:`CR-${marker}`,taxRegistrationNo:`TX-${marker}`}, address:{countryCode:"EG",city:"Cairo",addressLine:"Test address"}, accounting:{baseCurrency:"EGP",fiscalYearStartMonth:1,fiscalYearStartDay:1,fiscalYearEndMonth:12,fiscalYearEndDay:31,inventoryMethod:"PERIODIC"}, fiscalYear:{name:"FY 2026",startsAt:"2026-01-01",endsAt:"2026-12-31"} }) }), { params:Promise.resolve({id:companyId}) });
    expect(update.status).toBe(200);

    const bank = await createBankAccount(jsonRequest(`http://local.test/api/organizations/${companyId}/bank-accounts`, { bankName:"Integration Bank",accountName:"Main",accountNumber:`ACC-${marker}`,currency:"EGP",isActive:true }), { params:Promise.resolve({id:companyId}) });
    expect(bank.status).toBe(201);
    const complete = await updateOrganization(new Request(`http://local.test/api/organizations/${companyId}`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({legalName:"Integration Company Updated",onboardingStatus:"COMPLETE"}) }), { params:Promise.resolve({id:companyId}) });
    expect(complete.status).toBe(200);

    const read = await getOrganization(new Request(`http://local.test/api/organizations/${companyId}`), { params:Promise.resolve({id:companyId}) });
    expect(read.status).toBe(200);
    const persisted = await read.json();
    expect(persisted.legalName).toBe("Integration Company Updated");
    expect(persisted.fiscalYears).toHaveLength(1);
    expect(persisted.bankAccounts).toHaveLength(1);
    expect(persisted.onboardingStatus).toBe("COMPLETE");

    const sessionToken = cookieState.jar.get("money_coder_session")!;
    expect(await db.session.findUnique({where:{tokenHash:sha256(sessionToken)}})).not.toBeNull();
    const logoutResponse = await logout(new Request("http://local.test/api/auth/logout", {method:"POST"}));
    expect(logoutResponse.status).toBe(303);
    expect(cookieState.jar.has("money_coder_session")).toBe(false);
    expect((await db.session.findUniqueOrThrow({where:{tokenHash:sha256(sessionToken)}})).revokedAt).not.toBeNull();
  });

  it("denies modified tenant and document identifiers", async () => {
    await login(jsonRequest("http://local.test/api/auth/login", { email:companyEmail, password:firstPassword }));
    const outsider = await db.user.create({data:{email:`outsider-${marker}@test.local`,displayName:"Outsider",passwordHash:"test-only",emailVerifiedAt:new Date()}});
    const otherCompany = await db.organization.create({data:{type:"COMMERCIAL_COMPANY",legalName:"Other Company",createdById:outsider.id,memberships:{create:{userId:outsider.id,role:"COMPANY_OWNER"}}}});
    ids.users.push(outsider.id); ids.organizations.push(otherCompany.id);
    const asset = await db.fileAsset.create({data:{organizationId:otherCompany.id,uploadedById:outsider.id,kind:"LEGAL_DOCUMENT",originalName:"private.pdf",storageKey:`${otherCompany.id}/${randomUUID()}`,mimeType:"application/pdf",sizeBytes:10,sha256:"test",storageProvider:"local-dev"}});
    const document = await db.companyDocument.create({data:{organizationId:otherCompany.id,fileAssetId:asset.id,category:"LEGAL_DOCUMENT",title:"Private"}});

    const organizationResponse = await getOrganization(new Request(`http://local.test/api/organizations/${otherCompany.id}`), {params:Promise.resolve({id:otherCompany.id})});
    expect(organizationResponse.status).toBe(403);
    const documentResponse = await downloadDocument(new Request(`http://local.test/api/documents/${document.id}`), {params:Promise.resolve({documentId:document.id})});
    expect(documentResponse.status).toBe(404);
  });

  it("resets the password, revokes sessions, and rejects expired sessions", async () => {
    const forgot = await forgotPassword(jsonRequest("http://local.test/api/auth/forgot", {email:companyEmail}));
    expect(forgot.status).toBe(200);
    const resetUrl = (await forgot.json()).devResetUrl as string;
    const token = new URL(resetUrl).searchParams.get("token");
    const reset = await resetPassword(jsonRequest("http://local.test/api/auth/reset", {token,password:nextPassword}));
    expect(reset.status).toBe(200);
    expect((await login(jsonRequest("http://local.test/api/auth/login", {email:companyEmail,password:firstPassword}))).status).toBe(401);
    expect((await login(jsonRequest("http://local.test/api/auth/login", {email:companyEmail,password:nextPassword}))).status).toBe(200);

    const user = await db.user.findUniqueOrThrow({where:{email:companyEmail}});
    const expiredToken = `expired-${marker}`;
    await db.session.create({data:{userId:user.id,tokenHash:sha256(expiredToken),expiresAt:new Date(Date.now()-1_000)}});
    cookieState.jar.set("money_coder_session",expiredToken);
    expect(await getSessionUser()).toBeNull();
  });
});
