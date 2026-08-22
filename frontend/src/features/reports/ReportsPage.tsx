import { useQueries } from "@tanstack/react-query";
import { Banknote, CalendarDays, ChartColumn, Clock3, Download, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { QueryState } from "../../components/ui/QueryState";
import { StatCard } from "../../components/ui/StatCard";
import { useToast } from "../../components/ui/use-toast";
import { recentDateRange } from "../../lib/date";
import { formatCurrency, formatDuration } from "../../lib/format";
import { reportsApi } from "./api";

const COLORS = ["#4f46e5", "#10b981", "#ef4444", "#94a3b8"];
const colorAt = (index: number) => COLORS[index % COLORS.length] ?? COLORS[0] ?? "#4f46e5";

export function ReportsPage() {
  const initialDates = useMemo(() => recentDateRange(30), []);
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const notify = useToast();
  const [attendance, leave, payroll] = useQueries({
    queries: [
      {
        queryKey: ["reports", "attendance", startDate, endDate],
        queryFn: () => reportsApi.attendance(startDate, endDate),
        enabled: endDate >= startDate,
      },
      { queryKey: ["reports", "leave"], queryFn: reportsApi.leave },
      { queryKey: ["reports", "payroll"], queryFn: reportsApi.payroll },
    ],
  });
  const error = attendance.error ?? leave.error ?? payroll.error;
  const loading = attendance.isLoading || leave.isLoading || payroll.isLoading;
  const attendanceChart = attendance.data
    ? [
        { name: "Present", value: attendance.data.present },
        { name: "Absent", value: attendance.data.absent },
        { name: "Half day", value: attendance.data.half_day },
        { name: "Leave", value: attendance.data.leave },
      ]
    : [];
  const leaveChart = leave.data
    ? [
        { name: "Pending", value: leave.data.pending },
        { name: "Approved", value: leave.data.approved },
        { name: "Rejected", value: leave.data.rejected },
        { name: "Cancelled", value: leave.data.cancelled },
      ]
    : [];
  const download = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await reportsApi.exportAttendance();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dayflow-attendance.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      notify({ title: "Attendance report downloaded", tone: "success" });
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : "Unable to download report");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button disabled={exporting} onClick={() => void download()} variant="secondary">
            {exporting ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden className="size-4" />
            )}
            {exporting ? "Exporting…" : "Export attendance"}
          </Button>
        }
        description="Live attendance, leave, and payroll aggregates from Dayflow records."
        eyebrow="Insights"
        title="Reports and analytics"
      />
      {exportError ? <Alert>{exportError}</Alert> : null}
      <Card>
        <CardHeader>
          <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              Attendance from
              <Input
                className="mt-1"
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            <label className="text-sm text-slate-600">
              Attendance to
              <Input
                className="mt-1"
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
          </div>
        </CardHeader>
        <QueryState
          error={error}
          isLoading={loading}
          onRetry={() => {
            void attendance.refetch();
            void leave.refetch();
            void payroll.refetch();
          }}
        >
          {attendance.data && leave.data && payroll.data ? (
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={ChartColumn}
                  label="Attendance records"
                  value={attendance.data.total_records}
                />
                <StatCard
                  icon={Clock3}
                  label="Work duration"
                  value={formatDuration(attendance.data.total_work_duration)}
                />
                <StatCard
                  icon={CalendarDays}
                  label="Approved leave days"
                  value={leave.data.approved_days}
                />
                <StatCard
                  icon={Banknote}
                  label="Total net payroll"
                  value={formatCurrency(payroll.data.total_net, payroll.data.currency ?? "INR")}
                />
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-xl border border-slate-200 p-5">
                  <h2 className="font-semibold text-slate-950">Attendance status</h2>
                  <p className="mt-1 text-sm text-slate-500">Selected date range</p>
                  <div className="mt-5 h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={attendanceChart}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 p-5">
                  <h2 className="font-semibold text-slate-950">Leave decisions</h2>
                  <p className="mt-1 text-sm text-slate-500">All requests by current status</p>
                  <div className="mt-5 h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          data={leaveChart}
                          dataKey="value"
                          innerRadius={55}
                          nameKey="name"
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {leaveChart.map((entry, index) => (
                            <Cell fill={colorAt(index)} key={entry.name} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-600">
                    {leaveChart.map((entry, index) => (
                      <span className="flex items-center gap-1.5" key={entry.name}>
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: colorAt(index) }}
                        />
                        {entry.name}: {String(entry.value)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={Banknote}
                  label="Payroll records"
                  value={payroll.data.record_count}
                />
                <StatCard
                  icon={Banknote}
                  label="Total gross"
                  value={formatCurrency(payroll.data.total_gross, payroll.data.currency ?? "INR")}
                />
                <StatCard
                  icon={Banknote}
                  label="Total net"
                  value={formatCurrency(payroll.data.total_net, payroll.data.currency ?? "INR")}
                />
              </div>
            </CardContent>
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
