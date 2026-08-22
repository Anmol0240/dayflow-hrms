import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "../src/app/App";

describe("application bootstrap", () => {
  it("falls back to sign in when the refresh cookie is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "Authentication required",
            code: "INVALID_REFRESH_TOKEN",
            field_errors: {},
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
