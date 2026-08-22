import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { routeObjects } from "../src/app/router";
import { routes } from "../src/app/routes";
import { ToastProvider } from "../src/components/ui/ToastProvider";
import { AuthContext, type AuthContextValue } from "../src/features/auth/auth-context";
import { createQueryClient } from "../src/lib/query-client";
import type { User, UserRole } from "../src/types";

function user(role: UserRole): User {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    employee_id: role === "EMPLOYEE" ? "EMP-001" : "ADM-001",
    full_name: role === "EMPLOYEE" ? "Asha Rao" : "Nila Admin",
    email: `${role.toLowerCase()}@dayflow.dev`,
    role,
    is_active: true,
    is_email_verified: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function renderRoute(path: string, currentUser: User | null) {
  const value: AuthContextValue = {
    status: currentUser ? "authenticated" : "unauthenticated",
    user: currentUser,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
  const router = createMemoryRouter(routeObjects, { initialEntries: [path] });
  const queryClient = createQueryClient();
  queryClient.setQueryData(["dashboard", "employee"], {
    full_name: "Asha Rao",
    profile_completion: 80,
    checked_in_today: false,
    checked_out_today: false,
    pending_leave_requests: 1,
    approved_leave_days: 2,
    latest_net_salary: null,
    unread_notifications: 0,
  });
  queryClient.setQueryData(["dashboard", "admin"], {
    total_employees: 10,
    active_employees: 9,
    present_today: 7,
    employees_on_leave: 1,
    pending_leave_requests: 2,
    department_distribution: {},
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return router;
}

describe("route authorization", () => {
  it("redirects unauthenticated users to sign in", async () => {
    const router = renderRoute(routes.employeeDashboard, null);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(routes.signIn);
  });

  it("shows employee navigation without administrative links", async () => {
    renderRoute(routes.employeeDashboard, user("EMPLOYEE"));
    expect(await screen.findByRole("heading", { name: "Welcome back, Asha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My profile" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Employees" })).not.toBeInTheDocument();
  });

  it("shows HR navigation and blocks employee access to HR routes", async () => {
    renderRoute(routes.adminDashboard, user("HR"));
    expect(await screen.findByRole("link", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();

    const router = renderRoute(routes.adminPayroll, user("EMPLOYEE"));
    expect(await screen.findByRole("heading", { name: "Welcome back, Asha" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(routes.employeeDashboard);
  });
});
