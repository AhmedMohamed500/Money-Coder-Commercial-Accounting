import { NextResponse } from "next/server";
import { z } from "zod";
import { openingActor, openingBadOrigin, openingDenied, openingFailure, openingJson, openingNoStore, openingSameOrigin } from "@/lib/accounting/opening-api";
import { applyOpeningImport } from "@/lib/accounting/opening-service";

type Context = { params: Promise<{ id: string; batchId: string; stageId: string }> };
const schema = z.object({ action: z.enum(["APPLY", "REJECT"]), revision: z.number().int().positive(), accountMapping: z.record(z.string(), z.string().uuid()).default({}), overwriteExisting: z.boolean().default(false) });
export async function POST(request: Request, { params }: Context) {
  const { id, batchId, stageId } = await params;
  const actor = await openingActor(id, "accounting:opening:import");
  if (!actor) return openingDenied();
  if (!openingSameOrigin(request)) return openingBadOrigin();
  try {
    const parsed = schema.safeParse(await openingJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400, headers: openingNoStore });
    return NextResponse.json(await applyOpeningImport(id, batchId, stageId, actor, parsed.data, request), { headers: openingNoStore });
  } catch (error) { return openingFailure(error); }
}
