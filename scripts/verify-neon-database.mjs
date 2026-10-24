import { PrismaClient } from "@prisma/client";

const expectedTables = [
  "User",
  "Session",
  "EmailVerificationToken",
  "PasswordResetToken",
  "Organization",
  "OrganizationMembership",
  "OrganizationProfile",
  "OrganizationAddress",
  "CompanyLegalDetails",
  "CompanyContact",
  "CompanyBankAccount",
  "CompanyAccountingSettings",
  "CompanyFiscalYear",
  "FileAsset",
  "CompanyDocument",
  "OfficeCompanyEngagement",
  "EngagementStaff",
  "Invitation",
  "AuditEvent",
];

const expectedEnums = [
  "OrganizationType",
  "MembershipRole",
  "MembershipStatus",
  "EngagementStatus",
  "InvitationStatus",
  "FileKind",
  "InventoryMethod",
];

const preflight = process.argv.includes("--preflight");
const databaseUrl = process.env.DATABASE_URL;
const expectedEndpointId = process.env.EXPECTED_NEON_ENDPOINT_ID;
const expectedBranch = process.env.EXPECTED_NEON_BRANCH;
const expectedDatabase = process.env.EXPECTED_DATABASE_NAME ?? "neondb";

function fail(message, exitCode = 1) {
  console.error(`Database verification refused: ${message}`);
  process.exit(exitCode);
}

if (!databaseUrl) fail("DATABASE_URL is missing.");
if (!expectedEndpointId) fail("EXPECTED_NEON_ENDPOINT_ID is required to prove branch identity.");

let connectionUrl;
try {
  connectionUrl = new URL(databaseUrl);
} catch {
  fail("DATABASE_URL is not a valid URL.");
}

if (!["postgres:", "postgresql:"].includes(connectionUrl.protocol)) fail("DATABASE_URL is not PostgreSQL.");
if (!connectionUrl.hostname.endsWith(".neon.tech")) fail("host is not a Neon PostgreSQL endpoint.");
if (connectionUrl.hostname.includes("-pooler.")) fail("migrations and verification require a direct, non-pooler endpoint.");

const actualEndpointId = connectionUrl.hostname.split(".")[0];
if (actualEndpointId !== expectedEndpointId) fail("the URL endpoint does not match EXPECTED_NEON_ENDPOINT_ID.");
if (connectionUrl.pathname.slice(1) !== expectedDatabase) fail(`database name does not match ${expectedDatabase}.`);

const sslMode = connectionUrl.searchParams.get("sslmode")?.toLowerCase();
if (!sslMode || ["disable", "allow", "prefer"].includes(sslMode)) fail("TLS is not enforced by sslmode.");

const db = new PrismaClient();

function sanitizedError(error) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "UNKNOWN";
  const rawMessage = error instanceof Error ? error.message : "Unknown database error";
  const message = rawMessage
    .replaceAll(databaseUrl, "[REDACTED_DATABASE_URL]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .split("\n")[0];
  return { code, message };
}

try {
  const identity = await db.$queryRaw`
    SELECT current_database() AS database, current_setting('server_version') AS version
  `;
  const tables = await db.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const tableNames = tables.map((row) => row.table_name);
  const applicationTables = tableNames.filter((name) => name !== "_prisma_migrations");
  const missingTables = expectedTables.filter((name) => !applicationTables.includes(name));
  const unexpectedTables = applicationTables.filter((name) => !expectedTables.includes(name));

  const enums = await db.$queryRaw`
    SELECT t.typname AS enum_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `;
  const enumNames = enums.map((row) => row.enum_name);

  const constraintCounts = await db.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE contype = 'p')::int AS primary_keys,
      COUNT(*) FILTER (WHERE contype = 'f')::int AS foreign_keys,
      COUNT(*) FILTER (WHERE contype = 'u')::int AS unique_constraints,
      COUNT(*) FILTER (WHERE contype = 'c')::int AS check_constraints
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
  `;
  const indexCounts = await db.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE indexdef LIKE 'CREATE UNIQUE INDEX%')::int AS unique_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;

  const hasMigrationTable = tableNames.includes("_prisma_migrations");
  const migrations = hasMigrationTable
    ? await db.$queryRaw`
        SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
        FROM "_prisma_migrations"
        ORDER BY started_at
      `
    : [];

  const rowCounts = {};
  for (const table of expectedTables.filter((name) => tableNames.includes(name))) {
    const result = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    rowCounts[table] = result[0].count;
  }

  const failedMigrations = migrations.filter((migration) => !migration.finished && !migration.rolled_back);
  const missingEnums = expectedEnums.filter((name) => !enumNames.includes(name));
  const totalApplicationRows = Object.values(rowCounts).reduce((sum, count) => sum + count, 0);
  const validSchema =
    missingTables.length === 0 &&
    unexpectedTables.length === 0 &&
    missingEnums.length === 0 &&
    hasMigrationTable &&
    migrations.some((migration) => migration.migration_name === "20261023160000_init" && migration.finished) &&
    failedMigrations.length === 0;

  console.log(JSON.stringify({
    mode: preflight ? "preflight" : "post-migration",
    connection: {
      provider: "Neon PostgreSQL",
      branch: expectedBranch ?? "label-not-supplied",
      endpointIdentityMatched: true,
      connectionType: "direct",
      tlsMode: sslMode,
      database: identity[0].database,
      serverVersion: identity[0].version,
    },
    schema: {
      applicationTableCount: applicationTables.length,
      migrationTablePresent: hasMigrationTable,
      missingTables,
      unexpectedTables,
      enumCount: enumNames.length,
      missingEnums,
      constraints: constraintCounts[0],
      indexes: indexCounts[0],
      migrationCount: migrations.length,
      migrations,
      failedMigrationCount: failedMigrations.length,
      totalApplicationRows,
      rowCounts,
    },
    validSchema,
  }, null, 2));

  if (!preflight && !validSchema) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ databaseVerificationError: sanitizedError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
