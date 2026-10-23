import { spawnSync } from "node:child_process";
import path from "node:path";
import { start } from "local-postgres/tmp";

const root = process.cwd();
const postgres = await start({
  host: true,
  timeout: 0,
  prewarm: false,
  postgresOptions: process.platform === "win32" ? "-c unix_socket_directories=" : undefined,
  postgres: {
    version: "17",
    strategy: "prefer-download",
    cacheDir: path.join(root, ".cache", "local-postgres"),
  },
});

function run(script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: postgres.dsn, ...extraEnv },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} exited with status ${result.status}`);
}

try {
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
  run("node_modules/vitest/vitest.mjs", ["run", "tests/database.integration.test.ts", "tests/auth.integration.test.ts"], { RUN_DB_TESTS: "1" });
} finally {
  await postgres.stop({ force: true });
}
