import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorizeOrganization } from "@/lib/auth";

const marker = randomUUID();
const ids: { users: string[]; organizations: string[] } = { users: [], organizations: [] };

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("PostgreSQL tenant isolation and delegation", () => {
  beforeAll(async () => { await db.$connect(); });
  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: { in: ids.organizations } } });
    await db.user.deleteMany({ where: { id: { in: ids.users } } });
    await db.$disconnect();
  });

  it("persists company data and denies a user from another company", async () => {
    const ownerA = await db.user.create({ data: { email: `owner-a-${marker}@test.local`, displayName: "Owner A", passwordHash: "test-only", emailVerifiedAt: new Date() } });
    const ownerB = await db.user.create({ data: { email: `owner-b-${marker}@test.local`, displayName: "Owner B", passwordHash: "test-only", emailVerifiedAt: new Date() } });
    ids.users.push(ownerA.id, ownerB.id);
    const companyA = await db.organization.create({ data: { type:"COMMERCIAL_COMPANY",legalName:"Company A",createdById:ownerA.id,memberships:{create:{userId:ownerA.id,role:"COMPANY_OWNER"}},bankAccounts:{create:[{bankName:"Bank One",accountName:"Main",accountNumber:`A-${marker}`,currency:"EGP"},{bankName:"Bank Two",accountName:"Reserve",accountNumber:`B-${marker}`,currency:"USD"}]}} });
    const companyB = await db.organization.create({ data: { type:"COMMERCIAL_COMPANY",legalName:"Company B",createdById:ownerB.id,memberships:{create:{userId:ownerB.id,role:"COMPANY_OWNER"}}} });
    ids.organizations.push(companyA.id, companyB.id);
    const reloaded = await db.organization.findUnique({ where:{id:companyA.id}, include:{bankAccounts:true} });
    expect(reloaded?.bankAccounts).toHaveLength(2);
    expect(await authorizeOrganization(ownerA.id, companyA.id, "organization:edit")).not.toBeNull();
    expect(await authorizeOrganization(ownerA.id, companyB.id, "organization:view")).toBeNull();
  });

  it("grants assigned office access and removes it after revocation", async () => {
    const staff = await db.user.create({ data:{email:`staff-${marker}@test.local`,displayName:"Office Staff",passwordHash:"test-only",emailVerifiedAt:new Date()} }); ids.users.push(staff.id);
    const company = await db.organization.findFirstOrThrow({ where:{legalName:"Company A",id:{in:ids.organizations}} });
    const office = await db.organization.create({ data:{type:"ACCOUNTING_OFFICE",legalName:"Office Test",createdById:staff.id,memberships:{create:{userId:staff.id,role:"OFFICE_ACCOUNTANT"}}} }); ids.organizations.push(office.id);
    const membership = await db.organizationMembership.findUniqueOrThrow({where:{userId_organizationId:{userId:staff.id,organizationId:office.id}}});
    const engagement = await db.officeCompanyEngagement.create({data:{officeOrganizationId:office.id,companyOrganizationId:company.id,requestedById:staff.id,status:"ACTIVE",acceptedAt:new Date(),permissions:["organization:view"]}});
    await db.engagementStaff.create({data:{engagementId:engagement.id,membershipId:membership.id,userId:staff.id,permissions:["organization:view"]}});
    expect(await authorizeOrganization(staff.id,company.id,"organization:view")).not.toBeNull();
    await db.officeCompanyEngagement.update({where:{id:engagement.id},data:{status:"REVOKED",revokedAt:new Date()}});
    expect(await authorizeOrganization(staff.id,company.id,"organization:view")).toBeNull();
  });
});
