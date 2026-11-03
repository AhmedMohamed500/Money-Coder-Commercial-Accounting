import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { start } from "local-postgres/tmp";

const root = process.cwd();
const originalPath = process.env.PATH ?? "";
const postgresTempRoot = path.resolve(root, ".cache", "test-postgres");
const postgresTempRelative = path.relative(root, postgresTempRoot);
if (!postgresTempRelative || postgresTempRelative.startsWith("..") || path.isAbsolute(postgresTempRelative)) throw new Error("Temporary Postgres root must stay inside the project workspace");
mkdirSync(postgresTempRoot, { recursive: true });

function postgresVersion(binary) {
  const result = spawnSync(binary, ["--version"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.match(/PostgreSQL\)\s+(\d+)(?:\.\d+)?/i)?.[1] ?? null;
}

function cachedPostgresBinDir() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const packageCache = path.join(root, ".cache", "local-postgres", "embedded-postgres", `${platform}-${process.arch}`);
  if (!existsSync(packageCache)) return null;
  const executable = process.platform === "win32" ? ".exe" : "";
  const candidates = readdirSync(packageCache, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(packageCache, entry.name, "native", "bin"))
    .filter(binDir => postgresVersion(path.join(binDir, `postgres${executable}`)) === "17" && postgresVersion(path.join(binDir, `initdb${executable}`)) === "17")
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  return candidates.at(-1) ?? null;
}

if (postgresVersion("postgres") !== "17" || postgresVersion("initdb") !== "17") {
  const cachedBin = cachedPostgresBinDir();
  if (!cachedBin) throw new Error("PostgreSQL 17 is not installed on PATH and no complete project-local cached binary is available. Install PostgreSQL 17 manually or provide an approved local binary; this runner will not download one.");
  process.env.PATH = `${cachedBin}${path.delimiter}${originalPath}`;
}

let postgres;
let postgresDataDir;
let prismaWorkspace;

function run(script, args, extraEnv = {}, cwd = root) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd,
    env: { ...process.env, DATABASE_URL: postgres.dsn, ...extraEnv },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} exited with status ${result.status}`);
}

try {
  postgresDataDir = mkdtempSync(path.join(postgresTempRoot, "run-"));
  postgres = await start({
    dataDir: postgresDataDir,
    host: true,
    timeout: 0,
    prewarm: false,
    postgresOptions: process.platform === "win32" ? "-c unix_socket_directories=" : undefined,
    postgres: {
      version: "17",
      strategy: "local-only",
    },
  });
  prismaWorkspace = mkdtempSync(path.join(os.tmpdir(), "money-coder-prisma-"));
  cpSync(path.join(root, "prisma"), path.join(prismaWorkspace, "prisma"), { recursive: true });
  cpSync(path.join(root, "node_modules", "@prisma", "client"), path.join(prismaWorkspace, "node_modules", "@prisma", "client"), { recursive: true });
  const isolatedSchema = path.join(prismaWorkspace, "prisma", "schema.prisma");
  const clientOutput = path.join(root, "node_modules", ".prisma", "client").replaceAll("\\", "/");
  const schema = readFileSync(isolatedSchema, "utf8");
  if (!schema.includes('provider = "prisma-client-js"')) throw new Error("Expected Prisma client generator was not found");
  writeFileSync(isolatedSchema, schema.replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${clientOutput}"`));
  run("node_modules/prisma/build/index.js", ["generate", "--schema", isolatedSchema], { PRISMA_GENERATE_SKIP_AUTOINSTALL: "1" }, prismaWorkspace);
  run("node_modules/prisma/build/index.js", ["migrate", "deploy", "--schema", path.join(prismaWorkspace, "prisma", "schema.prisma")], {}, prismaWorkspace);
  run("node_modules/vitest/vitest.mjs", ["run", "tests/database.integration.test.ts", "tests/auth.integration.test.ts", "tests/storage.integration.test.ts", "tests/document-scan.integration.test.ts", "tests/chart.integration.test.ts"], { RUN_DB_TESTS: "1", PRIVATE_STORAGE_PROVIDER: "test-memory", PRIVATE_STORAGE_UPLOAD_MODE: "enabled", STORAGE_TEST_MODE: "1", AUTH_SECRET: "isolated-storage-test-secret-at-least-32-characters" });
} finally {
  try {
    if (postgres) await postgres.stop({ force: true });
  } finally {
    if (postgresDataDir) rmSync(postgresDataDir, { recursive: true, force: true });
    if (prismaWorkspace) rmSync(prismaWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    process.env.PATH = originalPath;
  }
}
