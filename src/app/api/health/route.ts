import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseConfigured, emailConfigured } from "@/lib/config";

export async function GET() {
  let database: "configured" | "connected" | "unavailable" = databaseConfigured() ? "configured" : "unavailable";
  if (databaseConfigured()) {
    try { await db.$queryRaw`SELECT 1`; database = "connected"; } catch { database = "unavailable"; }
  }
  return NextResponse.json({ service: "money-coder-commercial-accounting", status: database === "connected" ? "ok" : "degraded", database, email: emailConfigured() ? "configured" : "unavailable", privateStorage: process.env.NODE_ENV === "production" ? "unavailable" : "development-only" }, { status: database === "connected" ? 200 : 503, headers: { "cache-control": "no-store" } });
}
