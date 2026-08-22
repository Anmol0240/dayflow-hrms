import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const databasePath =
  process.env.DAYFLOW_E2E_DATABASE_PATH ?? join(tmpdir(), `dayflow-e2e-${randomUUID()}.db`);
const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");

if (existsSync(databasePath)) {
  console.error(`Refusing to overwrite an existing E2E database at ${databasePath}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [playwrightCli, "test"], {
  env: {
    ...process.env,
    DAYFLOW_E2E_DATABASE_PATH: databasePath,
  },
  stdio: "inherit",
});

try {
  rmSync(databasePath, { force: true, maxRetries: 10, retryDelay: 200 });
} catch (error) {
  console.error(`Unable to remove the E2E database at ${databasePath}.`, error);
  process.exitCode = 1;
}

if (result.error) {
  console.error(result.error);
  process.exitCode = 1;
} else if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
