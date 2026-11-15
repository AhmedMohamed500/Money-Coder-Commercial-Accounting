import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const safeRoot = await mkdtemp(path.join(os.tmpdir(), "money-coder-prisma-generate-"));
try {
  const schema = await readFile(path.join(root, "prisma", "schema.prisma"), "utf8");
  const output = path.join(root, "node_modules", ".prisma", "client").replaceAll("\\", "/");
  const safeSchema = schema.replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = "${output}"`);
  await writeFile(path.join(safeRoot, "schema.prisma"), safeSchema);
  await writeFile(path.join(safeRoot, "package.json"), JSON.stringify({ name: "isolated-prisma-generation", private: true, dependencies: { "@prisma/client": "6.12.0" } }));
  await mkdir(path.join(safeRoot, "node_modules", "@prisma"), { recursive: true });
  await cp(path.join(root, "node_modules", "@prisma", "client"), path.join(safeRoot, "node_modules", "@prisma", "client"), { recursive: true });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(DATABASE|DIRECT_URL|NEON|SMTP|AWS|S3|STORAGE|PRIVATE_STORAGE|AUTH_SECRET|APP_URL)/i.test(name)));
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "prisma", "build", "index.js"), "generate", "--schema", path.join(safeRoot, "schema.prisma")], { cwd: safeRoot, env: { ...environment, DATABASE_URL: "postgresql://isolated:isolated@127.0.0.1:5432/isolated", PRISMA_GENERATE_SKIP_AUTOINSTALL: "1" }, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma generate exited ${result.status}`);
} finally {
  const target = await realpath(safeRoot);
  const tempRoot = await realpath(os.tmpdir());
  if (!target.startsWith(tempRoot + path.sep)) throw new Error("Unsafe temporary cleanup target");
  await rm(target, { recursive: true, force: true });
}
