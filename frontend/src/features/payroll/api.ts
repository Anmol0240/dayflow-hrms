import { apiClient } from "../../lib/api-client";
import type { PayrollList, PayrollRecord } from "../../types/domain";

export interface PayrollInput {
  employee_id?: string;
  effective_from: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  currency: string;
  payslip_url: string | null;
}

function listPath(base: string, page: number, employeeId?: string): string {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  if (employeeId) params.set("employee_id", employeeId);
  return `${base}?${params.toString()}`;
}

export const payrollApi = {
  mine: (page: number) => apiClient.request<PayrollList>(listPath("/payroll/me", page)),
  all: (page: number, employeeId?: string) =>
    apiClient.request<PayrollList>(listPath("/payroll", page, employeeId)),
  create: (input: PayrollInput & { employee_id: string }) =>
    apiClient.request<PayrollRecord>("/payroll", { method: "POST", body: input }),
  update: (id: string, input: Omit<PayrollInput, "employee_id">) =>
    apiClient.request<PayrollRecord>(`/payroll/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    }),
};
