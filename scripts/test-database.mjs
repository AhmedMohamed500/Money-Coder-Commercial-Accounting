import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { cp, mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { start } from "local-postgres/tmp";

const root = process.cwd();
const safeRoot = await mkdtemp(path.join(os.tmpdir(), "money-coder-db-test-"));
const pgCacheRoot = path.join(root, ".cache");
await mkdir(pgCacheRoot, { recursive: true });
const pgTestRoot = await mkdtemp(path.join(pgCacheRoot, "pg-test-"));
const safePrisma = path.join(safeRoot, "prisma");
await mkdir(safePrisma);
await cp(path.join(root, "prisma", "schema.prisma"), path.join(safePrisma, "schema.prisma"));
await cp(path.join(root, "prisma", "migrations"), path.join(safePrisma, "migrations"), { recursive: true, filter: source => !path.basename(source).startsWith(".env") });
process.env.LOCAL_POSTGRES_SKIP_DOWNLOAD = "1";
const cachedBin = path.join(root, ".cache", "local-postgres", "embedded-postgres", "windows-x64", "17.10.0-beta.17", "native", "bin");
if (process.platform === "win32" && existsSync(path.join(cachedBin, "postgres.exe")) && existsSync(path.join(cachedBin, "initdb.exe"))) {
  process.env.PATH = `${cachedBin}${path.delimiter}${process.env.PATH ?? process.env.Path ?? ""}`;
}
let postgres;
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(DATABASE|DIRECT_URL|NEON|SMTP|AWS|S3|STORAGE|PRIVATE_STORAGE|AUTH_SECRET|APP_URL)/i.test(name)));

function run(script, args, extraEnv = {}, cwd = root) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd,
    env: { ...cleanEnvironment, DATABASE_URL: postgres.dsn, LOCAL_POSTGRES_SKIP_DOWNLOAD: "1", ...extraEnv },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} exited with status ${result.status}`);
}

try {
  process.stdout.write("Starting isolated PostgreSQL from local binaries...\n");
  postgres = await start({
    dataDir: pgTestRoot,
    keep: true,
    host: true,
    timeout: 0,
    prewarm: false,
    postgresOptions: process.platform === "win32" ? "-c unix_socket_directories=" : undefined,
    postgres: { version: "17", strategy: "local-only" },
  });
  process.stdout.write("Applying migrations to isolated PostgreSQL...\n");
  run("node_modules/prisma/build/index.js", ["migrate", "deploy", "--schema", path.join(safePrisma, "schema.prisma")], {}, safeRoot);
  process.stdout.write("Running database integration tests...\n");
  run("node_modules/vitest/vitest.mjs", ["run", "--no-file-parallelism", "tests/database.integration.test.ts", "tests/auth.integration.test.ts", "tests/storage.integration.test.ts", "tests/chart.integration.test.ts", "tests/opening.integration.test.ts", "tests/automation.integration.test.ts"], { RUN_DB_TESTS: "1", PRIVATE_STORAGE_PROVIDER: "test-memory", STORAGE_TEST_MODE: "1", AUTH_SECRET: "isolated-storage-test-secret-at-least-32-characters", AUTOMATION_MODE: "MOCK", AUTOMATION_CALLBACK_SECRET: "isolated-bank-callback-secret-at-least-32-characters" });
} finally {
  if (postgres) await postgres.stop({ force: true });
  const resolved = await realpath(safeRoot);
  const tempRoot = await realpath(os.tmpdir());
  if (!resolved.startsWith(tempRoot + path.sep)) throw new Error("Refusing cleanup outside temporary directory");
  await rm(resolved, { recursive: true, force: true });
  const resolvedPg = await realpath(pgTestRoot).catch(() => null);
  if (resolvedPg) {
    const resolvedCache = await realpath(pgCacheRoot);
    if (!resolvedPg.startsWith(resolvedCache + path.sep)) throw new Error("Refusing cleanup outside test cache");
    for (let attempt = 0; attempt < 6; attempt++) {
      try { await rm(resolvedPg, { recursive: true, force: true }); break; }
      catch (error) { if (attempt === 5 || error?.code !== "EBUSY") throw error; await new Promise(resolve => setTimeout(resolve, 500)); }
    }
  }
}
