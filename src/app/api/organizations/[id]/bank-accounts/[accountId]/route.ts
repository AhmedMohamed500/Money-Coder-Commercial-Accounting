import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;accountId:string}>}) { const user=await getSessionUser(); const {id,accountId}=await params; if(!user||!(await authorizeOrganization(user.id,id,"organization:edit"))) return NextResponse.json({error:"غير مصرح."},{status:403}); const result=await db.companyBankAccount.updateMany({where:{id:accountId,organizationId:id,deletedAt:null},data:{deletedAt:new Date(),isActive:false}}); if(!result.count) return NextResponse.json({error:"غير موجود."},{status:404}); await writeAudit({organizationId:id,actorUserId:user.id,action:"BANK_ACCOUNT_DELETED",entityType:"CompanyBankAccount",entityId:accountId,request}); return NextResponse.json({ok:true}); }
