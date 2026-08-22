import { apiClient } from "../../lib/api-client";
import type { PaginationMeta } from "../../types";
import type { EmployeeProfile } from "../../types/domain";

export interface EmployeeList {
  items: EmployeeProfile[];
  pagination: PaginationMeta;
}

export interface EmployeeFilters {
  page: number;
  pageSize: number;
  search: string;
  department: string;
  active: "all" | "active" | "inactive";
}

function query(filters: EmployeeFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
  });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.department.trim()) params.set("department", filters.department.trim());
  if (filters.active !== "all") params.set("is_active", String(filters.active === "active"));
  return params.toString();
}

export const employeesApi = {
  me: () => apiClient.request<EmployeeProfile>("/employees/me"),
  updateMe: (input: {
    profile_picture_url?: string | null;
    phone?: string | null;
    address?: string | null;
  }) => apiClient.request<EmployeeProfile>("/employees/me", { method: "PATCH", body: input }),
  list: (filters: EmployeeFilters) =>
    apiClient.request<EmployeeList>(`/employees?${query(filters)}`),
  get: (employeeId: string) =>
    apiClient.request<EmployeeProfile>(`/employees/${encodeURIComponent(employeeId)}`),
  create: (input: Record<string, unknown>) =>
    apiClient.request<EmployeeProfile>("/employees", { method: "POST", body: input }),
  update: (employeeId: string, input: Record<string, unknown>) =>
    apiClient.request<EmployeeProfile>(`/employees/${encodeURIComponent(employeeId)}`, {
      method: "PATCH",
      body: input,
    }),
  deactivate: (employeeId: string) =>
    apiClient.request<EmployeeProfile>(`/employees/${encodeURIComponent(employeeId)}`, {
      method: "DELETE",
    }),
};
