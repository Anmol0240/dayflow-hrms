import { apiClient } from "../../lib/api-client";
import type { LeaveList, LeaveRequest, LeaveStatus, LeaveType } from "../../types/domain";

export interface LeaveInput {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  employee_remarks?: string | null;
}

function listPath(
  base: string,
  page: number,
  status: LeaveStatus | "all",
  employeeId?: string,
): string {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  if (status !== "all") params.set("status", status);
  if (employeeId) params.set("employee_id", employeeId);
  return `${base}?${params.toString()}`;
}

export const leaveApi = {
  create: (input: LeaveInput) =>
    apiClient.request<LeaveRequest>("/leave-requests", { method: "POST", body: input }),
  mine: (page: number, status: LeaveStatus | "all") =>
    apiClient.request<LeaveList>(listPath("/leave-requests/me", page, status)),
  all: (page: number, status: LeaveStatus | "all", employeeId?: string) =>
    apiClient.request<LeaveList>(listPath("/leave-requests", page, status, employeeId)),
  cancel: (id: string) =>
    apiClient.request<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    }),
  approve: (id: string, reviewerComment: string | null) =>
    apiClient.request<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: { reviewer_comment: reviewerComment },
    }),
  reject: (id: string, reviewerComment: string) =>
    apiClient.request<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: { reviewer_comment: reviewerComment },
    }),
};
