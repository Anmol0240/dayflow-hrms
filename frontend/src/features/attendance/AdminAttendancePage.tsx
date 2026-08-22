import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { recentDateRange } from "../../lib/date";
import type { AttendanceRecord } from "../../types/domain";
import { employeesApi } from "../employees/api";
import { AttendanceEditDialog } from "./AttendanceEditDialog";
import { AttendanceTable } from "./AttendanceTable";
import { attendanceApi } from "./api";

export function AdminAttendancePage() {
  const defaults = useMemo(() => recentDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const filters = { page, pageSize: 20, startDate, endDate, ...(employeeId ? { employeeId } : {}) };
  const attendance = useQuery({
    queryKey: ["attendance", "admin", filters],
    queryFn: () => attendanceApi.all(filters),
  });
  const employees = useQuery({
    queryKey: ["employees", "attendance-options"],
    queryFn: () =>
      employeesApi.list({ page: 1, pageSize: 100, search: "", department: "", active: "all" }),
  });
  const names = useMemo(
    () =>
      new Map((employees.data?.items ?? []).map((employee) => [employee.id, employee.full_name])),
    [employees.data],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        description="Review employee time records and apply auditable corrections."
        eyebrow="HR attendance"
        title="Attendance management"
      />
      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-slate-600">
              Employee
              <Select
                className="mt-1 w-full"
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setPage(1);
                }}
                value={employeeId}
              >
                <option value="">All employees</option>
                {employees.data?.items.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} · {employee.employee_id}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm text-slate-600">
              From
              <Input
                className="mt-1"
                max={endDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={startDate}
              />
            </label>
            <label className="text-sm text-slate-600">
              To
              <Input
                className="mt-1"
                min={startDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={endDate}
              />
            </label>
          </div>
        </CardHeader>
        <QueryState
          error={attendance.error}
          isLoading={attendance.isLoading}
          onRetry={() => void attendance.refetch()}
        >
          {attendance.data ? (
            attendance.data.items.length ? (
              <>
                <AttendanceTable
                  employeeNames={names}
                  onEdit={setEditing}
                  records={attendance.data.items}
                />
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(attendance.data.pagination.total)} records
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
                      disabled={page >= attendance.data.pagination.pages}
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
                  icon={CalendarCheck}
                  description="No attendance records match these filters."
                  title="No records found"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
      <AttendanceEditDialog onClose={() => setEditing(null)} record={editing} />
    </div>
  );
}
