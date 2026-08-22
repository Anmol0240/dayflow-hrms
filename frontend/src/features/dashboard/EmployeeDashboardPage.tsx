import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarCheck, CalendarDays, Clock, LogIn, LogOut, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import { routes } from "../../app/routes";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { StatCard } from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/use-toast";
import { formatCurrency, formatDate } from "../../lib/format";
import { dashboardApi } from "./api";

export function EmployeeDashboardPage() {
  const queryClient = useQueryClient();
  const notify = useToast();
  const dashboard = useQuery({
    queryKey: ["dashboard", "employee"],
    queryFn: dashboardApi.employee,
  });
  const leave = useQuery({ queryKey: ["leave", "recent"], queryFn: dashboardApi.recentLeave });
  const payroll = useQuery({
    queryKey: ["payroll", "recent"],
    queryFn: dashboardApi.recentPayroll,
  });
  const notifications = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: dashboardApi.recentNotifications,
  });
  const attendance = useMutation({
    mutationFn: (action: "check-in" | "check-out") =>
      action === "check-in" ? dashboardApi.checkIn() : dashboardApi.checkOut(),
    onSuccess: async (_, action) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "employee"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      notify({ title: action === "check-in" ? "Checked in" : "Checked out", tone: "success" });
    },
    onError: (error) =>
      notify({
        title: "Attendance action failed",
        description: error instanceof Error ? error.message : "Try again.",
        tone: "error",
      }),
  });

  return (
    <QueryState
      error={dashboard.error}
      isLoading={dashboard.isLoading}
      onRetry={() => void dashboard.refetch()}
    >
      {dashboard.data ? (
        <div className="space-y-6">
          <PageHeader
            description="Here’s your current attendance, leave, payroll, and notification snapshot."
            eyebrow="Employee workspace"
            title={`Welcome back, ${dashboard.data.full_name.split(" ")[0] ?? dashboard.data.full_name}`}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              detail="Personal and employment details"
              icon={CalendarCheck}
              label="Profile completion"
              value={`${String(dashboard.data.profile_completion)}%`}
            />
            <StatCard
              detail="Requests awaiting HR review"
              icon={CalendarDays}
              label="Pending leave"
              value={dashboard.data.pending_leave_requests}
            />
            <StatCard
              detail="Across approved requests"
              icon={Clock}
              label="Approved leave days"
              value={dashboard.data.approved_leave_days}
            />
            <StatCard
              detail="Items needing your attention"
              icon={Bell}
              label="Unread notifications"
              value={dashboard.data.unread_notifications}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Today’s attendance</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Record your workday once. Dayflow calculates duration at check-out.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <StatusBadge
                      status={
                        dashboard.data.checked_out_today
                          ? "PRESENT"
                          : dashboard.data.checked_in_today
                            ? "PRESENT"
                            : "NOT CHECKED IN"
                      }
                    />
                    <p className="mt-3 text-sm text-slate-600">
                      {dashboard.data.checked_out_today
                        ? "Your workday is complete."
                        : dashboard.data.checked_in_today
                          ? "You are currently checked in."
                          : "Start your workday when you are ready."}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      disabled={dashboard.data.checked_in_today || attendance.isPending}
                      onClick={() => attendance.mutate("check-in")}
                    >
                      <LogIn aria-hidden className="size-4" />
                      Check in
                    </Button>
                    <Button
                      disabled={
                        !dashboard.data.checked_in_today ||
                        dashboard.data.checked_out_today ||
                        attendance.isPending
                      }
                      onClick={() => attendance.mutate("check-out")}
                      variant="secondary"
                    >
                      <LogOut aria-hidden className="size-4" />
                      Check out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Latest payroll</h3>
              </CardHeader>
              <CardContent>
                {payroll.data?.items[0] ? (
                  <div>
                    <p className="text-3xl font-semibold text-slate-950">
                      {formatCurrency(
                        payroll.data.items[0].net_salary,
                        payroll.data.items[0].currency,
                      )}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Effective {formatDate(payroll.data.items[0].effective_from)}
                    </p>
                    <Link
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline"
                      to={routes.payroll}
                    >
                      <WalletCards aria-hidden className="size-4" />
                      View payroll history
                    </Link>
                  </div>
                ) : (
                  <EmptyState
                    description="Your payroll will appear after HR publishes it."
                    title="No payroll available"
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="font-semibold text-slate-950">Recent leave requests</h3>
                <Link
                  className="text-sm font-medium text-indigo-700 hover:underline"
                  to={routes.leaveRequests}
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {leave.data?.items.length ? (
                  leave.data.items.map((item) => (
                    <div
                      className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      key={item.id}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.leave_type} · {String(item.number_of_days)} day
                          {item.number_of_days === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.start_date)} – {formatDate(item.end_date)}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))
                ) : (
                  <EmptyState
                    description="Submitted leave requests will appear here."
                    title="No leave requests"
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="font-semibold text-slate-950">Recent notifications</h3>
                <Link
                  className="text-sm font-medium text-indigo-700 hover:underline"
                  to={routes.notifications}
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.data?.items.length ? (
                  notifications.data.items.map((item) => (
                    <div
                      className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                      key={item.id}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${item.is_read ? "bg-slate-300" : "bg-indigo-600"}`}
                        />
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      </div>
                      <p className="mt-1 pl-4 text-xs text-slate-500">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState description="You’re all caught up." title="No notifications" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </QueryState>
  );
}
