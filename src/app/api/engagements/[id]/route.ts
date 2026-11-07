import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";
import { CHART_PERMISSIONS, OPENING_PERMISSIONS, type Permission } from "@/lib/permissions";
const schema=z.object({action:z.enum(["ACCEPT","REJECT","REVOKE"]),permissions:z.array(z.enum(["organization:view","organization:edit","documents:view","documents:manage","audit:view",...CHART_PERMISSIONS,...OPENING_PERMISSIONS])).optional()});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getSessionUser(); const {id}=await params;
  const engagement=await db.officeCompanyEngagement.findUnique({where:{id}});
  if(!user||!engagement||!(await authorizeOrganization(user.id,engagement.companyOrganizationId,"engagements:manage"))) return NextResponse.json({error:"غير مصرح."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"الإجراء غير صالح."},{status:400});
  const accountingPermissions=(parsed.data.permissions??[]).filter(permission=>permission.startsWith("accounting:"));
  for(const permission of accountingPermissions) if(!(await authorizeOrganization(user.id,engagement.companyOrganizationId,permission as Permission))) return NextResponse.json({error:"لا يمكن تفويض صلاحية محاسبية لا تملكها."},{status:403});
  const allowed=parsed.data.action==="REVOKE"?engagement.status==="ACTIVE":engagement.status==="PENDING";
  if(!allowed) return NextResponse.json({error:"انتقال حالة التفويض غير مسموح."},{status:409});
  const status=parsed.data.action==="ACCEPT"?"ACTIVE":parsed.data.action==="REJECT"?"REJECTED":"REVOKED";
  const existingPermissions=Array.isArray(engagement.permissions)?engagement.permissions.filter((item):item is string=>typeof item==="string"):[];
  const updated=await db.$transaction(async tx=>{
    const row=await tx.officeCompanyEngagement.update({where:{id},data:{status,permissions:parsed.data.permissions??existingPermissions,acceptedAt:status==="ACTIVE"?new Date():engagement.acceptedAt,revokedAt:status==="REVOKED"?new Date():null}});
    if(status==="REVOKED") await tx.engagementStaff.deleteMany({where:{engagementId:id}});
    return row;
  });
  await writeAudit({organizationId:engagement.companyOrganizationId,actorUserId:user.id,action:`ENGAGEMENT_${status}`,entityType:"OfficeCompanyEngagement",entityId:id,request});
  return NextResponse.json(updated);
}
