import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseConfiguration, emailConfiguration } from "@/lib/config";
import { privateStorageAvailability } from "@/lib/storage";

export async function GET() {
  const databaseConfig = databaseConfiguration();
  const emailConfig = emailConfiguration();
  const storage = await privateStorageAvailability();
  let database: "misconfigured" | "connected" | "unavailable" = databaseConfig.configured ? "unavailable" : "misconfigured";
  if (databaseConfig.configured) {
    try { await db.$queryRaw`SELECT 1`; database = "connected"; } catch { database = "unavailable"; }
  }
  const operational = database === "connected" && emailConfig.configured && storage.available;
  return NextResponse.json({ service: "money-coder-commercial-accounting", status: operational ? "ok" : "degraded", database, email: emailConfig.configured ? "configured" : "misconfigured", privateStorage: storage.state }, { status: operational ? 200 : 503, headers: { "cache-control": "no-store" } });
}
