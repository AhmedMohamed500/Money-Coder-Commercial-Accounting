import { NextResponse } from "next/server";
import { automationActor, automationDenied, privateNoStore } from "@/lib/accounting/automation-api";
import { listBankStatements } from "@/lib/accounting/bank-automation-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await automationActor(id, "bank-statements:view")) return automationDenied();
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1) || 1;
  return NextResponse.json(await listBankStatements(id, page, { search: url.searchParams.get("search") ?? undefined, status: url.searchParams.get("status") ?? undefined }), { headers: privateNoStore });
}
