import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseConfiguration, emailConfiguration } from "@/lib/config";
import { privateStorageAvailability } from "@/lib/storage";
import { privateStorageUploadMode } from "@/lib/config";

export async function GET() {
  const databaseConfig = databaseConfiguration();
  const emailConfig = emailConfiguration();
  const storage = await privateStorageAvailability();
  const uploadMode = privateStorageUploadMode();
  let database: "misconfigured" | "connected" | "unavailable" = databaseConfig.configured ? "unavailable" : "misconfigured";
  if (databaseConfig.configured) {
    try { await db.$queryRaw`SELECT 1`; database = "connected"; } catch { database = "unavailable"; }
  }
  const operational = database === "connected" && emailConfig.configured && (uploadMode === "disabled" || storage.available);
  return NextResponse.json({ service: "money-coder-commercial-accounting", status: operational ? "ok" : "degraded", database, email: emailConfig.configured ? "configured" : "misconfigured", privateStorage: storage.state, documentUploads: { mode: uploadMode, acceptsNew: uploadMode === "enabled" && storage.available, acceptsFinalization: uploadMode !== "disabled" && storage.available } }, { status: operational ? 200 : 503, headers: { "cache-control": "no-store" } });
}
