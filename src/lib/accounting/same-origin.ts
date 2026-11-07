export function accountingSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
  if (protocol !== "https" && protocol !== "http") return false;
  try { return origin === new URL(`${protocol}://${host || requestUrl.host}`).origin; }
  catch { return false; }
}
