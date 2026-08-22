import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/use-toast";
import { formatDate } from "../../lib/format";
import type { LeaveRequest, LeaveStatus } from "../../types/domain";
import { employeesApi } from "../employees/api";
import { leaveApi } from "./api";
import { LeaveDecisionDialog, type LeaveDecision } from "./LeaveDecisionDialog";

export function AdminLeavePage() {
  const [status, setStatus] = useState<LeaveStatus | "all">("PENDING");
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [decision, setDecision] = useState<LeaveDecision | null>(null);
  const queryClient = useQueryClient();
  const notify = useToast();
  const employees = useQuery({
    queryKey: ["employees", "leave-filter"],
    queryFn: () =>
      employeesApi.list({ page: 1, pageSize: 100, search: "", department: "", active: "all" }),
  });
  const requests = useQuery({
    queryKey: ["leave", "all", page, status, employeeId],
    queryFn: () => leaveApi.all(page, status, employeeId || undefined),
  });
  const names = useMemo(
    () => new Map(employees.data?.items.map((employee) => [employee.id, employee.full_name]) ?? []),
    [employees.data],
  );
  const review = useMutation({
    mutationFn: ({
      request,
      action,
      comment,
    }: {
      request: LeaveRequest;
      action: LeaveDecision;
      comment: string;
    }) =>
      action === "approve"
        ? leaveApi.approve(request.id, comment || null)
        : leaveApi.reject(request.id, comment),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      notify({
        title: variables.action === "approve" ? "Leave request approved" : "Leave request rejected",
        tone: "success",
      });
      setSelected(null);
      setDecision(null);
    },
  });

  const openDecision = (request: LeaveRequest, action: LeaveDecision) => {
    setSelected(request);
    setDecision(action);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review pending requests and keep an auditable record of every decision."
        eyebrow="Time off"
        title="Leave approvals"
      />
      <Card>
        <CardHeader className="grid gap-3 sm:grid-cols-2">
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
          <Select
            aria-label="Filter leave requests by employee"
            onChange={(event) => {
              setEmployeeId(event.target.value);
              setPage(1);
            }}
            value={employeeId}
          >
            <option value="">All employees</option>
            {employees.data?.items.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.employee_id})
              </option>
            ))}
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
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-slate-950">
                              {names.get(request.employee_id) ?? "Employee"}
                            </h3>
                            <StatusBadge status={request.status} />
                            <span className="text-xs font-medium text-slate-500">
                              {request.leave_type} leave
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {formatDate(request.start_date)} – {formatDate(request.end_date)} ·{" "}
                            {String(request.number_of_days)} day
                            {request.number_of_days === 1 ? "" : "s"}
                          </p>
                          <p className="mt-3 text-sm text-slate-800">{request.reason}</p>
                          {request.employee_remarks ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Remarks: {request.employee_remarks}
                            </p>
                          ) : null}
                          {request.reviewer_comment ? (
                            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                              <span className="font-medium">Decision note:</span>{" "}
                              {request.reviewer_comment}
                            </p>
                          ) : null}
                        </div>
                        {request.status === "PENDING" ? (
                          <div className="flex shrink-0 gap-2">
                            <Button
                              onClick={() => openDecision(request, "reject")}
                              size="sm"
                              variant="danger"
                            >
                              <X aria-hidden className="size-4" />
                              Reject
                            </Button>
                            <Button onClick={() => openDecision(request, "approve")} size="sm">
                              <Check aria-hidden className="size-4" />
                              Approve
                            </Button>
                          </div>
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
                  description="Try another employee or status filter."
                  title="No leave requests found"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
      <LeaveDecisionDialog
        decision={decision}
        employeeName={selected ? (names.get(selected.employee_id) ?? "Employee") : "Employee"}
        onClose={() => {
          setSelected(null);
          setDecision(null);
        }}
        onSubmit={async (comment) => {
          if (selected && decision)
            await review.mutateAsync({ request: selected, action: decision, comment });
        }}
        request={selected}
      />
    </div>
  );
}
