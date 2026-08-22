import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "../src/components/ui/ToastProvider";
import { QueryState } from "../src/components/ui/QueryState";
import { EmployeeAttendancePage } from "../src/features/attendance/EmployeeAttendancePage";
import { attendanceApi } from "../src/features/attendance/api";
import { employeesApi } from "../src/features/employees/api";
import { AdminLeavePage } from "../src/features/leave/AdminLeavePage";
import { ApplyLeavePage } from "../src/features/leave/ApplyLeavePage";
import { leaveApi } from "../src/features/leave/api";
import { createQueryClient } from "../src/lib/query-client";
import type { EmployeeProfile, LeaveRequest } from "../src/types/domain";

const pagination = { page: 1, page_size: 20, total: 0, pages: 0 };

function renderPage(element: ReactNode) {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{element}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("feature actions", () => {
  it("renders useful loading and retry states", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <QueryState error={undefined} isLoading onRetry={retry}>
        Ready
      </QueryState>,
    );
    expect(screen.getByText("Loading Dayflow data")).toBeInTheDocument();
    rerender(
      <QueryState error={new Error("Service unavailable")} isLoading={false} onRetry={retry}>
        Ready
      </QueryState>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("submits a validated leave application", async () => {
    const create = vi.spyOn(leaveApi, "create").mockResolvedValue({} as LeaveRequest);
    renderPage(
      <Routes>
        <Route element={<ApplyLeavePage />} path="/" />
        <Route element={<p>Request submitted</p>} path="/leave" />
      </Routes>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Reason/), "Family appointment");
    await user.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByText("Request submitted")).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Family appointment", leave_type: "PAID" }),
    );
  });

  it("checks in from the attendance screen", async () => {
    vi.spyOn(attendanceApi, "mine").mockResolvedValue({ items: [], pagination });
    vi.spyOn(attendanceApi, "summary").mockResolvedValue({
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      total: 0,
      present: 0,
      absent: 0,
      half_day: 0,
      leave: 0,
      total_work_duration: 0,
    });
    const checkIn = vi.spyOn(attendanceApi, "checkIn").mockResolvedValue({} as never);
    renderPage(<EmployeeAttendancePage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Check in" }));
    expect(checkIn).toHaveBeenCalledOnce();
  });

  it("lets HR approve a pending leave request", async () => {
    const employee = {
      id: "00000000-0000-0000-0000-000000000001",
      employee_id: "EMP-001",
      full_name: "Asha Rao",
    } as EmployeeProfile;
    const request = {
      id: "00000000-0000-0000-0000-000000000010",
      employee_id: employee.id,
      leave_type: "PAID",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      number_of_days: 2,
      reason: "Family appointment",
      status: "PENDING",
      employee_remarks: null,
      reviewer_comment: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: "2026-08-22T00:00:00Z",
      updated_at: "2026-08-22T00:00:00Z",
    } satisfies LeaveRequest;
    vi.spyOn(employeesApi, "list").mockResolvedValue({
      items: [employee],
      pagination: { ...pagination, page_size: 100, total: 1, pages: 1 },
    });
    vi.spyOn(leaveApi, "all").mockResolvedValue({
      items: [request],
      pagination: { ...pagination, total: 1, pages: 1 },
    });
    const approve = vi
      .spyOn(leaveApi, "approve")
      .mockResolvedValue({ ...request, status: "APPROVED" });
    renderPage(<AdminLeavePage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve request" }));
    expect(approve).toHaveBeenCalledWith(request.id, null);
  });
});
