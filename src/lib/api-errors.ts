import { NextResponse } from "next/server";

const CONNECTION_ERROR_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017"]);

export function databaseFailureResponse(cause: unknown) {
  const code = typeof cause === "object" && cause && "code" in cause ? String((cause as { code?: unknown }).code) : "";
  const message = cause instanceof Error ? cause.message : "";
  if (!CONNECTION_ERROR_CODES.has(code) && !message.includes("Can't reach database server") && !message.includes("Connection terminated")) return null;
  return NextResponse.json({ error: "قاعدة البيانات غير متاحة مؤقتًا. لم يتم حفظ أي تغييرات؛ حاول لاحقًا." }, { status: 503 });
}
