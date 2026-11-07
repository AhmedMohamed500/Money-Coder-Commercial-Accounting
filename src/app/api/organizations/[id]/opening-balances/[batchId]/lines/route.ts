import { NextResponse } from "next/server";
import { z } from "zod";
import { openingActor, openingBadOrigin, openingDenied, openingFailure, openingJson, openingNoStore, openingSameOrigin } from "@/lib/accounting/opening-api";
import { saveOpeningLine } from "@/lib/accounting/opening-service";

const lineSchema = z.object({ revision: z.number().int().positive(), accountId: z.string().uuid(), debit: z.string().max(32), credit: z.string().max(32), explanation: z.string().max(500).optional(), sourceReference: z.string().max(120).optional() });
type Context = { params: Promise<{ id: string; batchId: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id, batchId } = await params;
  const actor = await openingActor(id, "accounting:opening:edit");
  if (!actor) return openingDenied();
  if (!openingSameOrigin(request)) return openingBadOrigin();
  try {
    const parsed = lineSchema.safeParse(await openingJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات الحساب غير صالحة." }, { status: 400, headers: openingNoStore });
    return NextResponse.json(await saveOpeningLine(id, batchId, actor, parsed.data, request), { headers: openingNoStore });
  } catch (error) { return openingFailure(error); }
}
