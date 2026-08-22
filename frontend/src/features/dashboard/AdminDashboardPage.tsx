import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarDays, ClipboardCheck, UserCheck, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { routes } from "../../app/routes";
import { PageHeader } from "../../components/layout/PageHeader";
import { buttonVariants } from "../../components/ui/button-variants";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate } from "../../lib/format";
import { dashboardApi } from "./api";

const CHART_COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];

function dateValue(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminDashboardPage() {
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 13);
    return { start: dateValue(start), end: dateValue(end) };
  }, []);
  const dashboard = useQuery({ queryKey: ["dashboard", "admin"], queryFn: dashboardApi.admin });
  const attendance = useQuery({
    queryKey: ["attendance", "admin-dashboard", range],
    queryFn: () => dashboardApi.attendance(range.start, range.end),
  });
  const pendingLeave = useQuery({
    queryKey: ["leave", "pending", "dashboard"],
    queryFn: dashboardApi.pendingLeave,
  });

  const trend = useMemo(() => {
    const counts = new Map<string, number>();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(`${range.start}T00:00:00`);
      date.setDate(date.getDate() + index);
      counts.set(dateValue(date), 0);
    }
    for (const record of attendance.data?.items ?? []) {
      if (record.status === "PRESENT" || record.status === "HALF_DAY") {
        counts.set(record.attendance_date, (counts.get(record.attendance_date) ?? 0) + 1);
      }
    }
    return [...counts].map(([date, present]) => ({
      date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
        new Date(`${date}T00:00:00`),
      ),
      present,
    }));
  }, [attendance.data, range.start]);
  const departments = Object.entries(dashboard.data?.department_distribution ?? {}).map(
    ([name, value]) => ({ name, value }),
  );

  return (
    <QueryState
      error={dashboard.error}
      isLoading={dashboard.isLoading}
      onRetry={() => void dashboard.refetch()}
    >
      {dashboard.data ? (
        <div className="space-y-6">
          <PageHeader
            actions={
              <>
                <Link
                  className={buttonVariants({ variant: "secondary" })}
                  to={routes.leaveApprovals}
                >
                  Review leave
                </Link>
                <Link className={buttonVariants()} to={routes.employees}>
                  Manage employees
                </Link>
              </>
            }
            description="Monitor today’s workforce and move quickly on pending people operations."
            eyebrow="HR operations"
            title="Admin dashboard"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={UsersRound}
              label="Total employees"
              value={dashboard.data.total_employees}
            />
            <StatCard
              icon={UserCheck}
              label="Active employees"
              value={dashboard.data.active_employees}
            />
            <StatCard
              icon={CalendarCheck}
              label="Present today"
              value={dashboard.data.present_today}
            />
            <StatCard
              icon={CalendarDays}
              label="On leave"
              value={dashboard.data.employees_on_leave}
            />
            <StatCard
              icon={ClipboardCheck}
              label="Pending leave"
              value={dashboard.data.pending_leave_requests}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card aria-label="Fourteen-day attendance trend">
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Attendance trend</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Present and half-day records from the last 14 days.
                </p>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={trend} margin={{ left: -20, right: 12, top: 8 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                    <XAxis axisLine={false} dataKey="date" fontSize={12} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} fontSize={12} tickLine={false} />
                    <Tooltip />
                    <Line
                      dataKey="present"
                      dot={false}
                      stroke="#4f46e5"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card aria-label="Department distribution">
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Department distribution</h3>
              </CardHeader>
              <CardContent className="h-80">
                {departments.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie
                        data={departments}
                        dataKey="value"
                        innerRadius={55}
                        nameKey="name"
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {departments.map((department, index) => (
                          <Cell
                            fill={CHART_COLORS[index % CHART_COLORS.length] ?? "#4f46e5"}
                            key={department.name}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    description="Assign departments to employee profiles to populate this chart."
                    title="No department data"
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">Pending leave requests</h3>
                <p className="mt-1 text-sm text-slate-500">
                  The most recent requests awaiting a decision.
                </p>
              </div>
              <Link
                className="text-sm font-medium text-indigo-700 hover:underline"
                to={routes.leaveApprovals}
              >
                Open approvals
              </Link>
            </CardHeader>
            <CardContent>
              {pendingLeave.data?.items.length ? (
                <div className="divide-y divide-slate-100">
                  {pendingLeave.data.items.map((item) => (
                    <div
                      className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                      key={item.id}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.leave_type} leave · {String(item.number_of_days)} day
                          {item.number_of_days === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.start_date)} – {formatDate(item.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="There are no leave requests waiting for review."
                  title="Approval queue is clear"
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </QueryState>
  );
}
