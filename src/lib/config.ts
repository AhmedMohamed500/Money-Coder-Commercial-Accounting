export type ServiceConfiguration = { configured: boolean; reason?: string };

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function databaseConfiguration(): ServiceConfiguration {
  const value = process.env.DATABASE_URL;
  if (!value) return { configured: false, reason: "DATABASE_URL is missing" };
  try {
    const url = new URL(value);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return { configured: false, reason: "DATABASE_URL must use PostgreSQL" };
    if (!url.hostname || !url.pathname.slice(1)) return { configured: false, reason: "DATABASE_URL is incomplete" };
    if (process.env.NODE_ENV === "production" && !isLocalHost(url.hostname)) {
      const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
      if (!sslMode || ["disable", "allow", "prefer"].includes(sslMode)) return { configured: false, reason: "Production PostgreSQL must require TLS" };
    }
    return { configured: true };
  } catch {
    return { configured: false, reason: "DATABASE_URL is invalid" };
  }
}

export function databaseConfigured() {
  return databaseConfiguration().configured;
}

export function emailConfiguration(): ServiceConfiguration {
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.EMAIL_FROM) return { configured: false, reason: "SMTP credentials or EMAIL_FROM are missing" };
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { configured: false, reason: "SMTP_PORT is invalid" };
  return { configured: true };
}

export function emailConfigured() {
  return emailConfiguration().configured;
}

export function privateStorageConfiguration(): ServiceConfiguration {
  const provider = process.env.PRIVATE_STORAGE_PROVIDER?.trim() || (process.env.NODE_ENV === "production" ? "" : "local-dev");
  if (provider === "local-dev" && process.env.NODE_ENV !== "production") return { configured: true };
  if (!provider) return { configured: false, reason: "PRIVATE_STORAGE_PROVIDER is missing" };
  return { configured: false, reason: `Storage provider '${provider}' has no installed adapter` };
}
