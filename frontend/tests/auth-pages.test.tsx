import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useState, type PropsWithChildren } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { routeObjects } from "../src/app/router";
import { routes } from "../src/app/routes";
import { ToastProvider } from "../src/components/ui/ToastProvider";
import { AuthContext, type AuthContextValue } from "../src/features/auth/auth-context";
import { ApiError } from "../src/lib/api-client";
import { createQueryClient } from "../src/lib/query-client";
import type { User } from "../src/types";

const employee: User = {
  id: "00000000-0000-0000-0000-000000000001",
  employee_id: "EMP-001",
  full_name: "Asha Rao",
  email: "asha@dayflow.dev",
  role: "EMPLOYEE",
  is_active: true,
  is_email_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderSignIn(login: AuthContextValue["login"]) {
  const router = createMemoryRouter(routeObjects, { initialEntries: [routes.signIn] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthHarness login={login}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthHarness>
    </QueryClientProvider>,
  );
  return router;
}

function AuthHarness({ login, children }: PropsWithChildren<{ login: AuthContextValue["login"] }>) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const value = useMemo<AuthContextValue>(
    () => ({
      status: currentUser ? "authenticated" : "unauthenticated",
      user: currentUser,
      login: async (credentials) => {
        const authenticated = await login(credentials);
        setCurrentUser(authenticated);
        return authenticated;
      },
      logout: vi.fn(),
      refresh: vi.fn(),
    }),
    [currentUser, login],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

describe("authentication screens", () => {
  it("validates the login form before submission", async () => {
    const login = vi.fn<AuthContextValue["login"]>();
    renderSignIn(login);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("routes a successfully authenticated employee to their dashboard", async () => {
    const login = vi.fn<AuthContextValue["login"]>().mockResolvedValue(employee);
    const router = renderSignIn(login);
    await userEvent.type(screen.getByLabelText(/Work email/), "asha@dayflow.dev");
    await userEvent.type(screen.getByLabelText(/Password/), "SecurePassword123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(login).toHaveBeenCalledWith({
      email: "asha@dayflow.dev",
      password: "SecurePassword123!",
    });
    expect(router.state.location.pathname).toBe(routes.employeeDashboard);
  });

  it("shows backend field errors on the matching control", async () => {
    const login = vi.fn<AuthContextValue["login"]>().mockRejectedValue(
      new ApiError(422, {
        detail: "Invalid input",
        code: "VALIDATION_ERROR",
        field_errors: { email: ["This account cannot sign in"] },
      }),
    );
    renderSignIn(login);
    await userEvent.type(screen.getByLabelText(/Work email/), "asha@dayflow.dev");
    await userEvent.type(screen.getByLabelText(/Password/), "SecurePassword123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("This account cannot sign in")).toBeInTheDocument();
  });
});
