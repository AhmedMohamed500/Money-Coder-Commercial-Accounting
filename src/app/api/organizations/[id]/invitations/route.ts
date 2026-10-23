import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { emailSchema } from "@/lib/schemas";
import { randomToken, sha256 } from "@/lib/security";
import { z } from "zod";
import { emailConfigured } from "@/lib/config";
import { sendTransactionalEmail } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { roleMatchesOrganization } from "@/lib/permissions";
const schema=z.object({email:emailSchema,role:z.enum(["OFFICE_MANAGER","OFFICE_ACCOUNTANT","COMPANY_MANAGER","COMPANY_ACCOUNTANT","REVIEWER","VIEWER"])});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getSessionUser(); const {id}=await params;
  if(!user||!(await authorizeOrganization(user.id,id,"members:manage"))) return NextResponse.json({error:"غير مصرح."},{status:403});
  if(process.env.NODE_ENV==="production"&&!emailConfigured()) return NextResponse.json({error:"إرسال الدعوات معطل حتى تهيئة البريد الإنتاجي."},{status:503});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"بيانات الدعوة غير صالحة."},{status:400});
  const org=await db.organization.findUnique({where:{id}});
  if(!org||org.deletedAt) return NextResponse.json({error:"الكيان غير موجود."},{status:404});
  if(!roleMatchesOrganization(parsed.data.role,org.type)) return NextResponse.json({error:"الدور لا يناسب نوع الكيان."},{status:400});
  const [membership,pending]=await Promise.all([
    db.organizationMembership.findFirst({where:{organizationId:id,user:{email:parsed.data.email},deletedAt:null}}),
    db.invitation.findFirst({where:{organizationId:id,email:parsed.data.email,status:"PENDING",expiresAt:{gt:new Date()}}}),
  ]);
  if(membership) return NextResponse.json({error:"هذا البريد عضو في الكيان بالفعل."},{status:409});
  if(pending) return NextResponse.json({error:"توجد دعوة سارية لهذا البريد بالفعل."},{status:409});
  const token=randomToken();
  const invite=await db.invitation.create({data:{organizationId:id,email:parsed.data.email,role:parsed.data.role,tokenHash:sha256(token),invitedById:user.id,expiresAt:new Date(Date.now()+7*24*60*60_000)}});
  const origin=process.env.APP_URL||new URL(request.url).origin;
  const invitationUrl=`${origin}/api/invitations/accept?token=${encodeURIComponent(token)}`;
  if(process.env.NODE_ENV==="production") {
    try {
      await sendTransactionalEmail({to:parsed.data.email,subject:`دعوة للانضمام إلى ${org.legalName}`,text:`تمت دعوتك للانضمام إلى ${org.legalName}. افتح الرابط خلال 7 أيام: ${invitationUrl}`,html:`<p dir="rtl">تمت دعوتك للانضمام إلى Money Coder.</p><p><a href="${invitationUrl}">قبول الدعوة</a></p>`});
    } catch {
      await db.invitation.update({where:{id:invite.id},data:{status:"REVOKED"}});
      return NextResponse.json({error:"تعذر تسليم الدعوة. لم يتم تفعيلها ويمكن إعادة المحاولة."},{status:503});
    }
  }
  await writeAudit({organizationId:id,actorUserId:user.id,action:"INVITATION_CREATED",entityType:"Invitation",entityId:invite.id,request});
  return NextResponse.json({id:invite.id,message:"تم إنشاء الدعوة.",...(process.env.NODE_ENV!=="production"?{devInvitationUrl:invitationUrl}:{})},{status:201});
}
