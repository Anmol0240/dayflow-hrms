import { apiClient } from "../../lib/api-client";
import type {
  AdminDashboard,
  AttendanceList,
  EmployeeDashboard,
  LeaveList,
  NotificationList,
  PayrollList,
} from "../../types/domain";

export const dashboardApi = {
  employee: () => apiClient.request<EmployeeDashboard>("/dashboard/employee"),
  admin: () => apiClient.request<AdminDashboard>("/dashboard/admin"),
  recentLeave: () => apiClient.request<LeaveList>("/leave-requests/me?page=1&page_size=3"),
  recentPayroll: () => apiClient.request<PayrollList>("/payroll/me?page=1&page_size=1"),
  recentNotifications: () =>
    apiClient.request<NotificationList>("/notifications?page=1&page_size=3"),
  attendance: (startDate: string, endDate: string) =>
    apiClient.request<AttendanceList>(
      `/attendance?page=1&page_size=100&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    ),
  pendingLeave: () =>
    apiClient.request<LeaveList>("/leave-requests?page=1&page_size=5&status=PENDING"),
  checkIn: () => apiClient.request("/attendance/check-in", { method: "POST" }),
  checkOut: () => apiClient.request("/attendance/check-out", { method: "POST" }),
};
