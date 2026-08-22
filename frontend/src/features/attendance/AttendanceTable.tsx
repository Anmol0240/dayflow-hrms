import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate, formatDuration, formatTime } from "../../lib/format";
import type { AttendanceRecord } from "../../types/domain";

export function AttendanceTable({
  records,
  employeeNames,
  onEdit,
}: {
  records: AttendanceRecord[];
  employeeNames?: Map<string, string>;
  onEdit?: (record: AttendanceRecord) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {employeeNames ? <th className="px-5 py-3">Employee</th> : null}
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Check in</th>
            <th className="px-5 py-3">Check out</th>
            <th className="px-5 py-3">Duration</th>
            <th className="px-5 py-3">Status</th>
            {onEdit ? (
              <th className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr className="hover:bg-slate-50" key={record.id}>
              {employeeNames ? (
                <td className="px-5 py-4 font-medium text-slate-900">
                  {employeeNames.get(record.employee_id) ?? record.employee_id}
                </td>
              ) : null}
              <td className="px-5 py-4 text-slate-700">{formatDate(record.attendance_date)}</td>
              <td className="px-5 py-4 text-slate-600">{formatTime(record.check_in_time)}</td>
              <td className="px-5 py-4 text-slate-600">{formatTime(record.check_out_time)}</td>
              <td className="px-5 py-4 text-slate-600">{formatDuration(record.work_duration)}</td>
              <td className="px-5 py-4">
                <StatusBadge status={record.status} />
              </td>
              {onEdit ? (
                <td className="px-5 py-4 text-right">
                  <Button onClick={() => onEdit(record)} size="sm" variant="secondary">
                    Correct
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
