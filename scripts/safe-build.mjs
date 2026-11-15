import { spawnSync } from "node:child_process";
import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cacheRoot = path.join(root, ".cache");
const safeRoot = await mkdtemp(path.join(cacheRoot, "phase2c1-build-"));
try {
  const allowed = ["src", "public", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs", "tailwind.config.ts", "next-env.d.ts"];
  for (const entry of allowed) await cp(path.join(root, entry), path.join(safeRoot, entry), { recursive: true, filter: source => !path.basename(source).startsWith(".env") && !/credential|secret/i.test(path.basename(source)) });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(DATABASE|DIRECT_URL|NEON|SMTP|AWS|S3|STORAGE|PRIVATE_STORAGE|AUTH_SECRET|APP_URL|AUTOMATION|N8N|DOCUMENT_SCANNER)/i.test(name)));
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"], { cwd: safeRoot, env: { ...environment, DATABASE_URL: "postgresql://isolated:isolated@127.0.0.1:5432/isolated", AUTH_SECRET: "synthetic-build-secret-at-least-32-characters", PRIVATE_STORAGE_UPLOAD_MODE: "disabled", AUTOMATION_MODE: "DISABLED", NEXT_TELEMETRY_DISABLED: "1" }, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Sanitized build exited ${result.status}`);
} finally {
  const target = await realpath(safeRoot);
  const parent = await realpath(cacheRoot);
  if (!target.startsWith(parent + path.sep) || path.dirname(target) !== parent) throw new Error("Unsafe build cleanup target");
  await rm(target, { recursive: true, force: true });
}
