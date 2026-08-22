import { describe, expect, it, vi } from "vitest";

import { ApiClient } from "../src/lib/api-client";
import type { TokenResponse } from "../src/types";

const renewedSession: TokenResponse = {
  access_token: "renewed-access-token",
  token_type: "bearer",
  expires_in: 900,
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    employee_id: "EMP-001",
    full_name: "Asha Rao",
    email: "asha@dayflow.dev",
    role: "EMPLOYEE",
    is_active: true,
    is_email_verified: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
};

describe("API client", () => {
  it("rotates the refresh cookie and retries one unauthorized request", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(renewedSession), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ employee_id: "EMP-001" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient();

    const result = await client.request<{ employee_id: string }>("/employees/me");

    expect(result.employee_id).toBe("EMP-001");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/auth/refresh");
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers;
    expect(new Headers(retryHeaders).get("Authorization")).toBe("Bearer renewed-access-token");
  });

  it("preserves structured field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "Invalid input",
            code: "VALIDATION_ERROR",
            field_errors: { email: ["Enter a valid email"] },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const client = new ApiClient();

    await expect(client.request("/auth/login", { method: "POST", body: {} })).rejects.toMatchObject(
      { code: "VALIDATION_ERROR", fieldErrors: { email: ["Enter a valid email"] } },
    );
  });
});
