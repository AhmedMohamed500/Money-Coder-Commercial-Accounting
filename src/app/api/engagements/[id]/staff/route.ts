import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { mergePermissions, validPermissions } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
const schema=z.object({membershipId:z.string().uuid(),permissions:z.array(z.enum(["organization:view","organization:edit","documents:view","documents:manage","audit:view"])).min(1)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getSessionUser(); const {id}=await params;
  const engagement=await db.officeCompanyEngagement.findUnique({where:{id}});
  if(!user||!engagement||engagement.status!=="ACTIVE"||engagement.revokedAt||!(await authorizeOrganization(user.id,engagement.officeOrganizationId,"engagements:manage"))) return NextResponse.json({error:"غير مصرح أو التفويض غير نشط."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"بيانات التعيين غير صالحة."},{status:400});
  const member=await db.organizationMembership.findFirst({where:{id:parsed.data.membershipId,organizationId:engagement.officeOrganizationId,status:"ACTIVE",deletedAt:null}});
  if(!member) return NextResponse.json({error:"الموظف ليس عضوًا نشطًا في المكتب."},{status:400});
  const engagementPermissions=new Set(validPermissions(engagement.permissions));
  const rolePermissions=new Set(mergePermissions(member.role,member.permissions));
  if(parsed.data.permissions.some(permission=>!engagementPermissions.has(permission)||!rolePermissions.has(permission))) return NextResponse.json({error:"صلاحيات الموظف يجب أن تكون ضمن صلاحيات التفويض ودوره في المكتب."},{status:400});
  const assignment=await db.engagementStaff.upsert({where:{engagementId_membershipId:{engagementId:id,membershipId:member.id}},create:{engagementId:id,membershipId:member.id,userId:member.userId,permissions:parsed.data.permissions},update:{userId:member.userId,permissions:parsed.data.permissions}});
  await writeAudit({organizationId:engagement.officeOrganizationId,actorUserId:user.id,action:"ENGAGEMENT_STAFF_ASSIGNED",entityType:"EngagementStaff",entityId:assignment.id,request});
  return NextResponse.json(assignment,{status:201});
}
