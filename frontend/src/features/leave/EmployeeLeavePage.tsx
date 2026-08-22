import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { routes } from "../../app/routes";
import { PageHeader } from "../../components/layout/PageHeader";
import { buttonVariants } from "../../components/ui/button-variants";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/use-toast";
import { formatDate } from "../../lib/format";
import type { LeaveRequest, LeaveStatus } from "../../types/domain";
import { leaveApi } from "./api";

export function EmployeeLeavePage() {
  const [status, setStatus] = useState<LeaveStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);
  const queryClient = useQueryClient();
  const notify = useToast();
  const requests = useQuery({
    queryKey: ["leave", "me", page, status],
    queryFn: () => leaveApi.mine(page, status),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCancelling(null);
      notify({ title: "Leave request cancelled", tone: "success" });
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={buttonVariants()} to={routes.applyLeave}>
            <CalendarPlus aria-hidden className="size-4" />
            Apply for leave
          </Link>
        }
        description="Track every leave request and reviewer decision."
        eyebrow="Time off"
        title="My leave requests"
      />
      <Card>
        <CardHeader>
          <Select
            aria-label="Filter leave requests by status"
            onChange={(event) => {
              setStatus(event.target.value as LeaveStatus | "all");
              setPage(1);
            }}
            value={status}
          >
            <option value="all">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </CardHeader>
        <QueryState
          error={requests.error}
          isLoading={requests.isLoading}
          onRetry={() => void requests.refetch()}
        >
          {requests.data ? (
            requests.data.items.length ? (
              <>
                <div className="divide-y divide-slate-100">
                  {requests.data.items.map((request) => (
                    <article className="p-5" key={request.id}>
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-slate-950">
                              {request.leave_type.replaceAll("_", " ")} leave
                            </h3>
                            <StatusBadge status={request.status} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {formatDate(request.start_date)} – {formatDate(request.end_date)} ·{" "}
                            {String(request.number_of_days)} day
                            {request.number_of_days === 1 ? "" : "s"}
                          </p>
                          <p className="mt-3 text-sm text-slate-800">{request.reason}</p>
                          {request.employee_remarks ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Your remarks: {request.employee_remarks}
                            </p>
                          ) : null}
                          {request.reviewer_comment ? (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                              <span className="font-medium">Reviewer:</span>{" "}
                              {request.reviewer_comment}
                            </div>
                          ) : null}
                        </div>
                        {request.status === "PENDING" ? (
                          <Button
                            onClick={() => setCancelling(request)}
                            size="sm"
                            variant="secondary"
                          >
                            Cancel request
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(requests.data.pagination.total)} requests
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
                      disabled={page >= requests.data.pagination.pages}
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
                  action={
                    <Link className={buttonVariants()} to={routes.applyLeave}>
                      Apply for leave
                    </Link>
                  }
                  description="Your submitted requests will appear here."
                  title="No leave requests"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
      <ConfirmDialog
        confirmLabel="Cancel request"
        description="This pending request will be marked cancelled and cannot be reopened."
        onCancel={() => setCancelling(null)}
        onConfirm={async () => {
          if (cancelling) await cancel.mutateAsync(cancelling.id);
        }}
        open={Boolean(cancelling)}
        title="Cancel this leave request?"
      />
    </div>
  );
}
