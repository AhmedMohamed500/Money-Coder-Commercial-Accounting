export type ServiceConfiguration = { configured: boolean; reason?: string };
export type PrivateStorageConfiguration = ServiceConfiguration & {
  details?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
};

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

export function privateStorageConfiguration(): PrivateStorageConfiguration {
  const provider = process.env.PRIVATE_STORAGE_PROVIDER?.trim() || (process.env.NODE_ENV === "production" ? "" : "local-dev");
  if (provider === "local-dev" && process.env.NODE_ENV !== "production") return { configured: true };
  if (provider === "test-memory" && (process.env.NODE_ENV === "test" || process.env.STORAGE_TEST_MODE === "1")) return { configured: true };
  if (!provider) return { configured: false, reason: "PRIVATE_STORAGE_PROVIDER is missing" };
  if (provider !== "neon") return { configured: false, reason: "PRIVATE_STORAGE_PROVIDER is unsupported" };

  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim() ?? "";
  const region = process.env.AWS_REGION?.trim() ?? "";
  const bucket = process.env.PRIVATE_STORAGE_BUCKET?.trim() ?? "";
  const access = process.env.PRIVATE_STORAGE_ACCESS?.trim() ?? "";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? "";
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return { configured: false, reason: "Neon Object Storage configuration is incomplete" };
  }
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || !(url.hostname === "neon.tech" || url.hostname.endsWith(".neon.tech"))) {
      return { configured: false, reason: "AWS_ENDPOINT_URL_S3 must be a Neon HTTPS endpoint" };
    }
  } catch {
    return { configured: false, reason: "AWS_ENDPOINT_URL_S3 is invalid" };
  }
  if (!new Set(["us-east-1", "us-east-2", "eu-central-1", "ap-southeast-1"]).has(region)) {
    return { configured: false, reason: "AWS_REGION is not supported by Neon Object Storage" };
  }
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
    return { configured: false, reason: "PRIVATE_STORAGE_BUCKET is invalid" };
  }
  if (access !== "private") return { configured: false, reason: "PRIVATE_STORAGE_ACCESS must explicitly be private" };
  return { configured: true, details: { endpoint, region, bucket, accessKeyId, secretAccessKey } };
}
