import { NextResponse } from "next/server";
import { z } from "zod";
import { openingActor, openingBadOrigin, openingDenied, openingFailure, openingJson, openingNoStore, openingSameOrigin } from "@/lib/accounting/opening-api";
import { createOpeningBatch, openingOverview } from "@/lib/accounting/opening-service";

type Context = { params: Promise<{ id: string }> };
const createSchema = z.object({ fiscalYearId: z.string().uuid(), correctionOfId: z.string().uuid().optional(), correctionReason: z.string().trim().max(500).optional() });

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!await openingActor(id, "accounting:opening:view")) return openingDenied();
  try { return NextResponse.json(await openingOverview(id), { headers: openingNoStore }); }
  catch (error) { return openingFailure(error); }
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const actor = await openingActor(id, "accounting:opening:create");
  if (!actor) return openingDenied();
  if (!openingSameOrigin(request)) return openingBadOrigin();
  try {
    const parsed = createSchema.safeParse(await openingJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400, headers: openingNoStore });
    const result = await createOpeningBatch(id, actor, parsed.data.fiscalYearId, parsed.data.correctionOfId, parsed.data.correctionReason, request);
    return NextResponse.json(result, { status: result.reopened ? 200 : 201, headers: openingNoStore });
  } catch (error) { return openingFailure(error); }
}
