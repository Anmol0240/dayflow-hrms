import { ExternalLink, Pencil } from "lucide-react";

import { Button } from "../../components/ui/Button";
import { formatCurrency, formatDate } from "../../lib/format";
import type { PayrollRecord } from "../../types/domain";

export function PayrollTable({
  records,
  employeeNames,
  onEdit,
}: {
  records: PayrollRecord[];
  employeeNames?: Map<string, string>;
  onEdit?: (record: PayrollRecord) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {employeeNames ? <th className="px-5 py-3 font-medium">Employee</th> : null}
            <th className="px-5 py-3 font-medium">Effective from</th>
            <th className="px-5 py-3 font-medium">Basic</th>
            <th className="px-5 py-3 font-medium">Allowances</th>
            <th className="px-5 py-3 font-medium">Deductions</th>
            <th className="px-5 py-3 font-medium">Net salary</th>
            <th className="px-5 py-3 font-medium">Payslip</th>
            {onEdit ? <th className="px-5 py-3 font-medium">Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr className="text-slate-700" key={record.id}>
              {employeeNames ? (
                <td className="px-5 py-4 font-medium text-slate-950">
                  {employeeNames.get(record.employee_id) ?? "Employee"}
                </td>
              ) : null}
              <td className="px-5 py-4">{formatDate(record.effective_from)}</td>
              <td className="px-5 py-4">{formatCurrency(record.basic_salary, record.currency)}</td>
              <td className="px-5 py-4">{formatCurrency(record.allowances, record.currency)}</td>
              <td className="px-5 py-4">{formatCurrency(record.deductions, record.currency)}</td>
              <td className="px-5 py-4 font-semibold text-slate-950">
                {formatCurrency(record.net_salary, record.currency)}
              </td>
              <td className="px-5 py-4">
                {record.payslip_url ? (
                  <a
                    className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline"
                    href={record.payslip_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  "—"
                )}
              </td>
              {onEdit ? (
                <td className="px-5 py-4">
                  <Button
                    aria-label="Edit payroll record"
                    onClick={() => onEdit(record)}
                    size="sm"
                    variant="secondary"
                  >
                    <Pencil aria-hidden className="size-4" />
                    Edit
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
