import { NextResponse } from "next/server";
import { z } from "zod";
import { openingActor, openingBadOrigin, openingDenied, openingFailure, openingNoStore, openingSameOrigin } from "@/lib/accounting/opening-api";
import { OpeningError, stageOpeningImport } from "@/lib/accounting/opening-service";
import { parseOpeningXlsx } from "@/lib/accounting/opening-excel";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; batchId: string }> };
const mappingSchema = z.record(z.enum(["code", "name", "debit", "credit", "explanation", "sourceReference"]), z.number().int().min(1).max(20));

async function boundedBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2_500_000) throw new OpeningError("حجم الطلب أكبر من الحد المسموح.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new OpeningError("ملف Excel مطلوب.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_500_000) throw new OpeningError("حجم الطلب أكبر من الحد المسموح.", 413);
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const isolated = new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) });
  return isolated.formData();
}

export async function POST(request: Request, { params }: Context) {
  const { id, batchId } = await params;
  const actor = await openingActor(id, "accounting:opening:import");
  if (!actor) return openingDenied();
  if (!openingSameOrigin(request)) return openingBadOrigin();
  try {
    const form = await boundedBody(request);
    const file = form.get("file");
    const revision = Number(form.get("revision"));
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || !Number.isSafeInteger(revision) || revision < 1) throw new OpeningError("اختر ملف XLSX ورقم مراجعة صحيحًا.");
    const rawMapping = form.get("mapping");
    let mapping;
    if (rawMapping) {
      try { const parsed = mappingSchema.safeParse(JSON.parse(String(rawMapping))); if (parsed.success) mapping = parsed.data; else throw new Error(); }
      catch { throw new OpeningError("ربط أعمدة الملف غير صالح."); }
    }
    let parsed;
    try { parsed = await parseOpeningXlsx(Buffer.from(await file.arrayBuffer()), mapping); }
    catch (error) { if (error instanceof OpeningError) throw error; throw new OpeningError("تعذر تحليل ملف XLSX. تأكد أنه ملف Excel سليم بلا صيغ أو محتوى نشط."); }
    return NextResponse.json(await stageOpeningImport(id, batchId, actor, { revision, name: file.name, ...parsed }, request), { status: 201, headers: openingNoStore });
  } catch (error) { return openingFailure(error); }
}
