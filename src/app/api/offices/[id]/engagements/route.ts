import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";
const schema=z.object({companyOrganizationId:z.string().uuid()});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getSessionUser(); const {id}=await params;
  if(!user||!(await authorizeOrganization(user.id,id,"engagements:manage"))) return NextResponse.json({error:"غير مصرح."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"معرف الشركة غير صالح."},{status:400});
  const [office,company,existing]=await Promise.all([db.organization.findUnique({where:{id}}),db.organization.findUnique({where:{id:parsed.data.companyOrganizationId}}),db.officeCompanyEngagement.findUnique({where:{officeOrganizationId_companyOrganizationId:{officeOrganizationId:id,companyOrganizationId:parsed.data.companyOrganizationId}}})]);
  if(office?.type!=="ACCOUNTING_OFFICE"||office.deletedAt||company?.type!=="COMMERCIAL_COMPANY"||company.deletedAt) return NextResponse.json({error:"المكتب أو الشركة غير صالح."},{status:400});
  if(existing&&["PENDING","ACTIVE"].includes(existing.status)) return NextResponse.json({error:"يوجد طلب قائم أو تفويض نشط بالفعل."},{status:409});
  const engagement=existing
    ? await db.officeCompanyEngagement.update({where:{id:existing.id},data:{status:"PENDING",requestedById:user.id,permissions:["organization:view","documents:view"],revokedAt:null,acceptedAt:null}})
    : await db.officeCompanyEngagement.create({data:{officeOrganizationId:id,companyOrganizationId:company.id,requestedById:user.id,status:"PENDING",permissions:["organization:view","documents:view"]}});
  await writeAudit({organizationId:id,actorUserId:user.id,action:"ENGAGEMENT_REQUESTED",entityType:"OfficeCompanyEngagement",entityId:engagement.id,request});
  return NextResponse.json(engagement,{status:201});
}
