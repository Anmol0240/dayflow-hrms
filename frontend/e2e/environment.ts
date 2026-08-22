import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

export const repositoryRoot = resolve(import.meta.dirname, "../..");
export const backendDirectory = resolve(repositoryRoot, "backend");
export const databaseDirectory = tmpdir();
export const databasePath =
  process.env.DAYFLOW_E2E_DATABASE_PATH ??
  resolve(databaseDirectory, `dayflow-e2e-${randomUUID()}.db`);
process.env.DAYFLOW_E2E_DATABASE_PATH = databasePath;
export const python = process.env.DAYFLOW_E2E_PYTHON ?? "python";

export const backendEnvironment = {
  ...process.env,
  DAYFLOW_ENVIRONMENT: "test",
  DAYFLOW_DATABASE_URL: `sqlite+aiosqlite:///${databasePath.replaceAll("\\", "/")}`,
  DAYFLOW_JWT_SECRET: "e2e-secret-with-at-least-thirty-two-characters",
  DAYFLOW_CORS_ORIGINS: "http://127.0.0.1:5173",
  DAYFLOW_SEED_ADMIN_EMAIL: "admin@dayflow.dev",
  DAYFLOW_SEED_ADMIN_PASSWORD: "DayflowDemo123!",
  DAYFLOW_SEED_HR_EMAIL: "hr@dayflow.dev",
  DAYFLOW_SEED_HR_PASSWORD: "DayflowDemo123!",
  DAYFLOW_SEED_EMPLOYEE_PASSWORD: "DayflowDemo123!",
};
