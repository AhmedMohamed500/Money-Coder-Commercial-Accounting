import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { deletePrivateFile, savePrivateFile, validateUpload } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";
import type { FileKind } from "@prisma/client";

const kinds = new Set<FileKind>(["LOGO","LEGAL_DOCUMENT","TAX_DOCUMENT","OTHER"]);
export async function POST(request: Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getSessionUser(); const {id}=await params;
  if(!user||!(await authorizeOrganization(user.id,id,"documents:manage"))) return NextResponse.json({error:"غير مصرح."},{status:403});
  let storedKey: string | undefined;
  try {
    const form=await request.formData(); const file=form.get("file"); const kind=String(form.get("kind")||"OTHER") as FileKind; const title=String(form.get("title")||"").trim();
    if(!(file instanceof File)||!kinds.has(kind)||title.length<2||title.length>200) return NextResponse.json({error:"بيانات الملف غير صالحة."},{status:400});
    const bytes=await validateUpload(file); const stored=await savePrivateFile(id,file,bytes); storedKey=stored.storageKey;
    const document=await db.$transaction(async tx=>{ const asset=await tx.fileAsset.create({data:{organizationId:id,uploadedById:user.id,kind,originalName:file.name.slice(0,255),storageKey:stored.storageKey,mimeType:file.type,sizeBytes:file.size,sha256:stored.sha256,storageProvider:stored.provider}}); const doc=await tx.companyDocument.create({data:{organizationId:id,fileAssetId:asset.id,category:kind,title}}); if(kind==="LOGO") await tx.organizationProfile.upsert({where:{organizationId:id},create:{organizationId:id,logoFileId:asset.id},update:{logoFileId:asset.id}}); return doc; });
    await writeAudit({organizationId:id,actorUserId:user.id,action:"DOCUMENT_UPLOADED",entityType:"CompanyDocument",entityId:document.id,request}); return NextResponse.json(document,{status:201});
  } catch(cause) {
    if(storedKey) await deletePrivateFile(storedKey);
    const message=cause instanceof Error&&["نوع الملف غير مسموح. استخدم PDF أو PNG أو JPG أو XLSX.","حجم الملف غير مسموح.","محتوى الملف لا يطابق نوعه المعلن.","التخزين الخاص غير مهيأ للإنتاج."].includes(cause.message)?cause.message:"تعذر حفظ الملف بأمان.";
    return NextResponse.json({error:message},{status:message==="التخزين الخاص غير مهيأ للإنتاج."?503:400});
  }
}
