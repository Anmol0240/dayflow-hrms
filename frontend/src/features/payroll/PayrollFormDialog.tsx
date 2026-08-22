import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { formatCurrency } from "../../lib/format";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { EmployeeProfile, PayrollRecord } from "../../types/domain";
import type { PayrollInput } from "./api";

export function PayrollFormDialog({
  open,
  record,
  employees,
  onClose,
  onSubmit,
}: {
  open: boolean;
  record: PayrollRecord | null;
  employees: EmployeeProfile[];
  onClose: () => void;
  onSubmit: (input: PayrollInput & { employee_id: string }) => Promise<void>;
}) {
  if (!open) return null;
  return (
    <PayrollForm
      key={record?.id ?? "create"}
      employees={employees}
      onClose={onClose}
      onSubmit={onSubmit}
      record={record}
    />
  );
}

function PayrollForm({
  record,
  employees,
  onClose,
  onSubmit,
}: {
  record: PayrollRecord | null;
  employees: EmployeeProfile[];
  onClose: () => void;
  onSubmit: (input: PayrollInput & { employee_id: string }) => Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState(record?.employee_id ?? employees[0]?.id ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(
    record?.effective_from ?? new Date().toISOString().slice(0, 10),
  );
  const [basic, setBasic] = useState(record?.basic_salary ?? "0");
  const [allowances, setAllowances] = useState(record?.allowances ?? "0");
  const [deductions, setDeductions] = useState(record?.deductions ?? "0");
  const [currency, setCurrency] = useState(record?.currency ?? "INR");
  const [payslip, setPayslip] = useState(record?.payslip_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useModalAccessibility(true, onClose, submitting);
  const basicValue = Number(basic);
  const allowanceValue = Number(allowances);
  const deductionValue = Number(deductions);
  const numbers = [basicValue, allowanceValue, deductionValue];
  const gross = basicValue + allowanceValue;
  const net = gross - deductionValue;
  const invalid =
    numbers.some((value) => !Number.isFinite(value) || value < 0) ||
    net < 0 ||
    !employeeId ||
    !effectiveFrom ||
    !/^[A-Za-z]{3}$/.test(currency);
  const submit = async () => {
    if (invalid) {
      setError("Complete all required fields with non-negative salary values.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        employee_id: employeeId,
        effective_from: effectiveFrom,
        basic_salary: basicValue,
        allowances: allowanceValue,
        deductions: deductionValue,
        currency: currency.toUpperCase(),
        payslip_url: payslip || null,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save payroll");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div
      aria-labelledby="payroll-form-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"
      ref={dialogRef}
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold text-slate-950" id="payroll-form-title">
              {record ? "Update payroll" : "Create payroll record"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gross and net salary are calculated by the server.
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          {error ? <Alert>{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="payroll_employee" label="Employee" required>
              <Select
                className="w-full"
                disabled={Boolean(record)}
                id="payroll_employee"
                onChange={(event) => setEmployeeId(event.target.value)}
                value={employeeId}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.employee_id})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField htmlFor="payroll_effective" label="Effective from" required>
              <Input
                id="payroll_effective"
                onChange={(event) => setEffectiveFrom(event.target.value)}
                type="date"
                value={effectiveFrom}
              />
            </FormField>
            <FormField htmlFor="payroll_basic" label="Basic salary" required>
              <Input
                id="payroll_basic"
                min="0"
                onChange={(event) => setBasic(event.target.value)}
                step="0.01"
                type="number"
                value={basic}
              />
            </FormField>
            <FormField htmlFor="payroll_allowances" label="Allowances">
              <Input
                id="payroll_allowances"
                min="0"
                onChange={(event) => setAllowances(event.target.value)}
                step="0.01"
                type="number"
                value={allowances}
              />
            </FormField>
            <FormField htmlFor="payroll_deductions" label="Deductions">
              <Input
                id="payroll_deductions"
                min="0"
                onChange={(event) => setDeductions(event.target.value)}
                step="0.01"
                type="number"
                value={deductions}
              />
            </FormField>
            <FormField htmlFor="payroll_currency" label="Currency" required>
              <Input
                id="payroll_currency"
                maxLength={3}
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              />
            </FormField>
          </div>
          <FormField htmlFor="payroll_payslip" label="Payslip URL">
            <Input
              id="payroll_payslip"
              onChange={(event) => setPayslip(event.target.value)}
              type="url"
              value={payslip}
            />
          </FormField>
          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
              Calculated preview
            </p>
            <p className="mt-1 text-xl font-semibold text-indigo-950">
              Net{" "}
              {formatCurrency(net, /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "INR")}
            </p>
            <p className="text-xs text-indigo-700">
              Gross{" "}
              {formatCurrency(
                gross,
                /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "INR",
              )}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button disabled={submitting} onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button disabled={submitting || invalid} onClick={() => void submit()}>
              {submitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              {submitting ? "Saving…" : "Save payroll"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
