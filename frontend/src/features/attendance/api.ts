import { apiClient } from "../../lib/api-client";
import type { AttendanceList, AttendanceRecord, AttendanceSummary } from "../../types/domain";

export interface AttendanceFilters {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  employeeId?: string;
}

function params(filters: AttendanceFilters): string {
  const query = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
  });
  if (filters.startDate) query.set("start_date", filters.startDate);
  if (filters.endDate) query.set("end_date", filters.endDate);
  if (filters.employeeId) query.set("employee_id", filters.employeeId);
  return query.toString();
}

export const attendanceApi = {
  mine: (filters: AttendanceFilters) =>
    apiClient.request<AttendanceList>(`/attendance/me?${params(filters)}`),
  all: (filters: AttendanceFilters) =>
    apiClient.request<AttendanceList>(`/attendance?${params(filters)}`),
  summary: (startDate: string, endDate: string) =>
    apiClient.request<AttendanceSummary>(
      `/attendance/summary?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    ),
  checkIn: () => apiClient.request<AttendanceRecord>("/attendance/check-in", { method: "POST" }),
  checkOut: () => apiClient.request<AttendanceRecord>("/attendance/check-out", { method: "POST" }),
  update: (id: string, input: Record<string, unknown>) =>
    apiClient.request<AttendanceRecord>(`/attendance/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    }),
};
