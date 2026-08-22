import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Clock, LogIn, LogOut } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { QueryState } from "../../components/ui/QueryState";
import { StatCard } from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/use-toast";
import { recentDateRange, toDateInput } from "../../lib/date";
import { formatDuration } from "../../lib/format";
import { AttendanceTable } from "./AttendanceTable";
import { attendanceApi } from "./api";

export function EmployeeAttendancePage() {
  const defaults = useMemo(() => recentDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const notify = useToast();
  const filters = { page, pageSize: 20, startDate, endDate };
  const records = useQuery({
    queryKey: ["attendance", "me", filters],
    queryFn: () => attendanceApi.mine(filters),
  });
  const summary = useQuery({
    queryKey: ["attendance", "summary", startDate, endDate],
    queryFn: () => attendanceApi.summary(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });
  const today = records.data?.items.find(
    (record) => record.attendance_date === toDateInput(new Date()),
  );
  const action = useMutation({
    mutationFn: (kind: "in" | "out") =>
      kind === "in" ? attendanceApi.checkIn() : attendanceApi.checkOut(),
    onSuccess: async (_, kind) => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "employee"] });
      notify({ title: kind === "in" ? "Checked in" : "Checked out", tone: "success" });
    },
    onError: (error) =>
      notify({
        title: "Attendance action failed",
        description: error instanceof Error ? error.message : "Try again.",
        tone: "error",
      }),
  });
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              disabled={Boolean(today?.check_in_time) || action.isPending}
              onClick={() => action.mutate("in")}
            >
              <LogIn aria-hidden className="size-4" />
              Check in
            </Button>
            <Button
              disabled={!today?.check_in_time || Boolean(today.check_out_time) || action.isPending}
              onClick={() => action.mutate("out")}
              variant="secondary"
            >
              <LogOut aria-hidden className="size-4" />
              Check out
            </Button>
          </>
        }
        description="Record your workday and review your personal attendance history."
        eyebrow="Time tracking"
        title="My attendance"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Present" value={summary.data?.present ?? "—"} />
        <StatCard icon={CalendarCheck} label="Half days" value={summary.data?.half_day ?? "—"} />
        <StatCard icon={CalendarCheck} label="Leave days" value={summary.data?.leave ?? "—"} />
        <StatCard
          icon={Clock}
          label="Recorded time"
          value={summary.data ? formatDuration(summary.data.total_work_duration) : "—"}
        />
      </div>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-950">History</h3>
          <div className="mt-4 flex flex-wrap gap-3">
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
          error={records.error}
          isLoading={records.isLoading}
          onRetry={() => void records.refetch()}
        >
          {records.data ? (
            records.data.items.length ? (
              <>
                <AttendanceTable records={records.data.items} />
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(records.data.pagination.total)} records
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
                      disabled={page >= records.data.pagination.pages}
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
                  description="No attendance records match this date range."
                  title="No attendance found"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
