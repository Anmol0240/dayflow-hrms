import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../auth/use-auth";
import { employeesApi, type EmployeeFilters } from "./api";
import { EmployeeCreateDialog } from "./EmployeeCreateDialog";

export function EmployeeManagementPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState<EmployeeFilters["active"]>("all");
  const [sort, setSort] = useState<"name" | "employee_id">("name");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const filters = { page, pageSize: 20, search: deferredSearch, department, active } as const;
  const employees = useQuery({
    queryKey: ["employees", "list", filters],
    queryFn: () => employeesApi.list(filters),
  });
  const items = useMemo(
    () =>
      [...(employees.data?.items ?? [])].sort((a, b) =>
        sort === "name"
          ? a.full_name.localeCompare(b.full_name)
          : a.employee_id.localeCompare(b.employee_id),
      ),
    [employees.data, sort],
  );
  const changeFilter = (change: () => void) => {
    change();
    setPage(1);
  };
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus aria-hidden className="size-4" />
            Add employee
          </Button>
        }
        description="Search, onboard, review, and manage employee accounts and profiles."
        eyebrow="People directory"
        title="Employee management"
      />
      <Card>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative">
              <span className="sr-only">Search employees</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-2.5 size-5 text-slate-400"
              />
              <Input
                className="pl-10"
                onChange={(event) => changeFilter(() => setSearch(event.target.value))}
                placeholder="Search name, ID, or email"
                value={search}
              />
            </label>
            <Input
              aria-label="Filter by department"
              onChange={(event) => changeFilter(() => setDepartment(event.target.value))}
              placeholder="Department"
              value={department}
            />
            <Select
              aria-label="Filter by account status"
              onChange={(event) =>
                changeFilter(() => setActive(event.target.value as EmployeeFilters["active"]))
              }
              value={active}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              aria-label="Sort employees"
              onChange={(event) => setSort(event.target.value as "name" | "employee_id")}
              value={sort}
            >
              <option value="name">Sort by name</option>
              <option value="employee_id">Sort by employee ID</option>
            </Select>
          </div>
        </CardContent>
      </Card>
      <QueryState
        error={employees.error}
        isLoading={employees.isLoading}
        onRetry={() => void employees.refetch()}
      >
        {employees.data ? (
          items.length ? (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-5 py-3">ID</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">Job title</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((employee) => (
                      <tr className="hover:bg-slate-50" key={employee.id}>
                        <td className="px-5 py-4">
                          <Link
                            className="font-medium text-slate-950 hover:text-indigo-700"
                            to={`/admin/employees/${encodeURIComponent(employee.employee_id)}`}
                          >
                            {employee.full_name}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{employee.employee_id}</td>
                        <td className="px-5 py-4 text-slate-600">{employee.department ?? "—"}</td>
                        <td className="px-5 py-4 text-slate-600">{employee.job_title ?? "—"}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={employee.role} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={employee.is_active ? "ACTIVE" : "INACTIVE"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Page {String(employees.data.pagination.page)} of{" "}
                  {String(Math.max(1, employees.data.pagination.pages))} ·{" "}
                  {String(employees.data.pagination.total)} employees
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    size="sm"
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={page >= employees.data.pagination.pages}
                    onClick={() => setPage((current) => current + 1)}
                    size="sm"
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              action={<Button onClick={() => setCreateOpen(true)}>Add employee</Button>}
              description="Try changing the filters or onboard a new employee."
              title="No employees found"
            />
          )
        ) : null}
      </QueryState>
      {user ? (
        <EmployeeCreateDialog
          actorRole={user.role}
          onClose={() => setCreateOpen(false)}
          open={createOpen}
        />
      ) : null}
    </div>
  );
}
