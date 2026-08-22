import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { backendDirectory, backendEnvironment, databaseDirectory, python } from "./environment";

function runPython(arguments_: string[]) {
  const result = spawnSync(python, arguments_, {
    cwd: backendDirectory,
    env: backendEnvironment,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Phase 8 setup failed: ${result.stderr || result.stdout}`);
  }
}

export default function globalSetup() {
  mkdirSync(databaseDirectory, { recursive: true });
  runPython(["-m", "alembic", "upgrade", "head"]);
  runPython(["-m", "app.seed"]);
}
