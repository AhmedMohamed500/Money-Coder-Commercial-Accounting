import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseConfiguration, emailConfiguration, privateStorageConfiguration } from "@/lib/config";

export async function GET() {
  const databaseConfig = databaseConfiguration();
  const emailConfig = emailConfiguration();
  const storageConfig = privateStorageConfiguration();
  let database: "misconfigured" | "connected" | "unavailable" = databaseConfig.configured ? "unavailable" : "misconfigured";
  if (databaseConfig.configured) {
    try { await db.$queryRaw`SELECT 1`; database = "connected"; } catch { database = "unavailable"; }
  }
  const operational = database === "connected" && emailConfig.configured && storageConfig.configured;
  return NextResponse.json({ service: "money-coder-commercial-accounting", status: operational ? "ok" : "degraded", database, email: emailConfig.configured ? "configured" : "misconfigured", privateStorage: storageConfig.configured ? (process.env.NODE_ENV === "production" ? "configured" : "development-only") : "misconfigured" }, { status: operational ? 200 : 503, headers: { "cache-control": "no-store" } });
}
