export const APPLICATION_NAME = "Dayflow";

const configuredApiBaseUrl: unknown = import.meta.env["VITE_API_BASE_URL"];
export const API_BASE_URL = (
  typeof configuredApiBaseUrl === "string" ? configuredApiBaseUrl : "/api/v1"
).replace(/\/$/, "");

export const DEFAULT_QUERY_STALE_TIME = 30_000;
