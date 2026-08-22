import { apiClient } from "../../lib/api-client";
import type { AttendanceReport, LeaveReport, PayrollReport } from "../../types/domain";

export const reportsApi = {
  attendance: (startDate: string, endDate: string) =>
    apiClient.request<AttendanceReport>(
      `/reports/attendance?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    ),
  leave: () => apiClient.request<LeaveReport>("/reports/leave"),
  payroll: () => apiClient.request<PayrollReport>("/reports/payroll"),
  exportAttendance: () => apiClient.download("/reports/export"),
};
