import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/use-toast";
import type { PayrollRecord } from "../../types/domain";
import { employeesApi } from "../employees/api";
import { payrollApi, type PayrollInput } from "./api";
import { PayrollFormDialog } from "./PayrollFormDialog";
import { PayrollTable } from "./PayrollTable";

export function AdminPayrollPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PayrollRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const notify = useToast();
  const employees = useQuery({
    queryKey: ["employees", "payroll-options"],
    queryFn: () =>
      employeesApi.list({ page: 1, pageSize: 100, search: "", department: "", active: "all" }),
  });
  const payroll = useQuery({
    queryKey: ["payroll", "all", page, employeeId],
    queryFn: () => payrollApi.all(page, employeeId || undefined),
  });
  const names = useMemo(
    () => new Map(employees.data?.items.map((employee) => [employee.id, employee.full_name]) ?? []),
    [employees.data],
  );
  const save = useMutation({
    mutationFn: ({
      input,
      record,
    }: {
      input: PayrollInput & { employee_id: string };
      record: PayrollRecord | null;
    }) => {
      if (!record) return payrollApi.create(input);
      return payrollApi.update(record.id, {
        effective_from: input.effective_from,
        basic_salary: input.basic_salary,
        allowances: input.allowances,
        deductions: input.deductions,
        currency: input.currency,
        payslip_url: input.payslip_url,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payroll"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      notify({ title: "Payroll record saved", tone: "success" });
      setDialogOpen(false);
      setEditing(null);
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            disabled={!employees.data?.items.length}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden className="size-4" />
            Add payroll
          </Button>
        }
        description="Create effective salary records and maintain payslip access."
        eyebrow="Compensation"
        title="Payroll management"
      />
      <Card>
        <CardHeader>
          <Select
            aria-label="Filter payroll by employee"
            className="w-full sm:max-w-sm"
            onChange={(event) => {
              setEmployeeId(event.target.value);
              setPage(1);
            }}
            value={employeeId}
          >
            <option value="">All employees</option>
            {employees.data?.items.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.employee_id})
              </option>
            ))}
          </Select>
        </CardHeader>
        <QueryState
          error={payroll.error}
          isLoading={payroll.isLoading}
          onRetry={() => void payroll.refetch()}
        >
          {payroll.data ? (
            payroll.data.items.length ? (
              <>
                <PayrollTable
                  employeeNames={names}
                  onEdit={(record) => {
                    setEditing(record);
                    setDialogOpen(true);
                  }}
                  records={payroll.data.items}
                />
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(payroll.data.pagination.total)} records
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                      size="sm"
                      variant="secondary"
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={page >= payroll.data.pagination.pages}
                      onClick={() => setPage((value) => value + 1)}
                      size="sm"
                      variant="secondary"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent>
                <EmptyState
                  icon={Banknote}
                  description="Add the first effective salary record."
                  title="No payroll records"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
      <PayrollFormDialog
        employees={employees.data?.items ?? []}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={async (input) => {
          await save.mutateAsync({ input, record: editing });
        }}
        open={dialogOpen}
        record={editing}
      />
    </div>
  );
}
