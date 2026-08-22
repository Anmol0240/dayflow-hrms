import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryState } from "../../components/ui/QueryState";
import { PayrollTable } from "./PayrollTable";
import { payrollApi } from "./api";

export function EmployeePayrollPage() {
  const [page, setPage] = useState(1);
  const payroll = useQuery({
    queryKey: ["payroll", "me", page],
    queryFn: () => payrollApi.mine(page),
  });
  return (
    <div className="space-y-6">
      <PageHeader
        description="Your salary history is private and read-only."
        eyebrow="Compensation"
        title="My payroll"
      />
      <Card>
        <QueryState
          error={payroll.error}
          isLoading={payroll.isLoading}
          onRetry={() => void payroll.refetch()}
        >
          {payroll.data ? (
            payroll.data.items.length ? (
              <>
                <PayrollTable records={payroll.data.items} />
                <div className="flex items-center justify-between border-t border-slate-200 p-4">
                  <p className="text-sm text-slate-500">
                    {String(payroll.data.pagination.total)} records
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
                      disabled={page >= payroll.data.pagination.pages}
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
                  icon={Banknote}
                  description="HR has not published a salary record for your account."
                  title="No payroll records"
                />
              </CardContent>
            )
          ) : null}
        </QueryState>
      </Card>
    </div>
  );
}
