import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { useToast } from "../../components/ui/use-toast";
import { formatDate, formatTime } from "../../lib/format";
import { cn } from "../../lib/utils";
import { notificationsApi } from "./api";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const notify = useToast();
  const notifications = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => notificationsApi.list(page),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      notify({
        title: result.updated_count ? "All notifications marked read" : "You're all caught up",
        tone: "success",
      });
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          notifications.data?.unread_count ? (
            <Button
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
              variant="secondary"
            >
              <CheckCheck aria-hidden className="size-4" />
              Mark all read
            </Button>
          ) : undefined
        }
        description="Updates about leave decisions, payroll, and account activity."
        eyebrow="Inbox"
        title="Notifications"
      />
      <Card>
        <QueryState
          error={notifications.error}
          isLoading={notifications.isLoading}
          onRetry={() => void notifications.refetch()}
        >
          {notifications.data ? (
            notifications.data.items.length ? (
              <>
                <div className="divide-y divide-slate-100">
                  {notifications.data.items.map((item) => (
                    <article
                      className={cn("flex gap-4 p-5", !item.is_read && "bg-indigo-50/50")}
                      key={item.id}
                    >
                      <span
                        className={cn(
                          "mt-1 grid size-9 shrink-0 place-items-center rounded-full",
                          item.is_read
                            ? "bg-slate-100 text-slate-500"
                            : "bg-indigo-100 text-indigo-700",
                        )}
                      >
                        <Bell aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-medium text-slate-950">{item.title}</h2>
                          {!item.is_read ? <Badge tone="info">New</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(item.created_at)} at {formatTime(item.created_at)} ·{" "}
                          {item.notification_type.replaceAll("_", " ").toLowerCase()}
                        </p>
                      </div>
                      {!item.is_read ? (
                        <Button
                          disabled={markRead.isPending}
                          onClick={() => markRead.mutate(item.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </article>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(notifications.data.unread_count)} unread ·{" "}
                    {String(notifications.data.pagination.total)} total
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
                      disabled={page >= notifications.data.pagination.pages}
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
                  icon={Bell}
                  description="Important updates will appear here."
                  title="You're all caught up"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
