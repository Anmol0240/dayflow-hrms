import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, Save, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { buttonVariants } from "../../components/ui/button-variants";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import { QueryState } from "../../components/ui/QueryState";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/use-toast";
import { useAuth } from "../auth/use-auth";
import { applyApiErrors } from "../auth/form-errors";
import { employeesApi } from "./api";

const schema = z.object({
  full_name: z.string().trim().min(2).max(200),
  email: z.email(),
  role: z.enum(["EMPLOYEE", "HR"]),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || value.length >= 5, "Enter at least 5 characters")
    .max(32),
  address: z.string().trim().max(1000),
  department: z.string().trim().max(120),
  job_title: z.string().trim().max(160),
  employment_type: z.union([
    z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
    z.literal(""),
  ]),
  joining_date: z.string(),
});
type Values = z.infer<typeof schema>;

export function EmployeeDetailsPage() {
  const { employeeId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const employee = useQuery({
    queryKey: ["employees", "detail", employeeId],
    queryFn: () => employeesApi.get(employeeId),
    enabled: Boolean(employeeId),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "EMPLOYEE",
      phone: "",
      address: "",
      department: "",
      job_title: "",
      employment_type: "",
      joining_date: "",
    },
  });
  useEffect(() => {
    if (employee.data)
      form.reset({
        full_name: employee.data.full_name,
        email: employee.data.email,
        role: employee.data.role === "HR" ? "HR" : "EMPLOYEE",
        phone: employee.data.phone ?? "",
        address: employee.data.address ?? "",
        department: employee.data.department ?? "",
        job_title: employee.data.job_title ?? "",
        employment_type: (employee.data.employment_type as Values["employment_type"]) ?? "",
        joining_date: employee.data.joining_date ?? "",
      });
  }, [employee.data, form]);
  const update = useMutation({
    mutationFn: (values: Values) => {
      const payload: Record<string, unknown> = {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        address: values.address || null,
        department: values.department || null,
        job_title: values.job_title || null,
        employment_type: values.employment_type || null,
        joining_date: values.joining_date || null,
      };
      if (user?.role === "ADMIN") payload["role"] = values.role;
      return employeesApi.update(employeeId, payload);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(["employees", "detail", employeeId], result);
      await queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
      notify({ title: "Employee updated", tone: "success" });
    },
  });
  const deactivate = useMutation({
    mutationFn: () => employeesApi.deactivate(employeeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      notify({ title: "Employee deactivated", tone: "success" });
      void navigate(routes.employees);
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await update.mutateAsync(values);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  return (
    <QueryState
      error={employee.error}
      isLoading={employee.isLoading}
      onRetry={() => void employee.refetch()}
    >
      {employee.data ? (
        <div className="space-y-6">
          <PageHeader
            actions={
              <>
                <Link className={buttonVariants({ variant: "secondary" })} to={routes.employees}>
                  <ArrowLeft aria-hidden className="size-4" />
                  Directory
                </Link>
                {employee.data.is_active ? (
                  <Button onClick={() => setConfirmDeactivate(true)} variant="danger">
                    <UserX aria-hidden className="size-4" />
                    Deactivate
                  </Button>
                ) : null}
              </>
            }
            description={`${employee.data.employee_id} · ${employee.data.department ?? "No department assigned"}`}
            eyebrow="Employee details"
            title={employee.data.full_name}
          />
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={employee.data.role} />
            <StatusBadge status={employee.data.is_active ? "ACTIVE" : "INACTIVE"} />
            {employee.data.is_email_verified ? <StatusBadge status="EMAIL VERIFIED" /> : null}
          </div>
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-950">Profile and employment</h3>
              <p className="mt-1 text-sm text-slate-500">
                Administrative fields are protected by backend role checks.
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-5 md:grid-cols-2"
                noValidate
                onSubmit={(event) => void submit(event)}
              >
                {formError ? (
                  <div className="md:col-span-2">
                    <Alert>{formError}</Alert>
                  </div>
                ) : null}
                <FormField
                  error={form.formState.errors.full_name?.message}
                  htmlFor="employee_full_name"
                  label="Full name"
                  required
                >
                  <Input id="employee_full_name" {...form.register("full_name")} />
                </FormField>
                <FormField
                  error={form.formState.errors.email?.message}
                  htmlFor="employee_email"
                  label="Email"
                  required
                >
                  <Input id="employee_email" type="email" {...form.register("email")} />
                </FormField>
                <FormField
                  error={form.formState.errors.role?.message}
                  hint={user?.role === "ADMIN" ? undefined : "Only an Admin can change roles."}
                  htmlFor="employee_role"
                  label="Role"
                >
                  <Select
                    className="w-full"
                    disabled={user?.role !== "ADMIN"}
                    id="employee_role"
                    {...form.register("role")}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="HR">HR</option>
                  </Select>
                </FormField>
                <FormField
                  error={form.formState.errors.phone?.message}
                  htmlFor="employee_phone"
                  label="Phone"
                >
                  <Input id="employee_phone" {...form.register("phone")} />
                </FormField>
                <FormField
                  error={form.formState.errors.department?.message}
                  htmlFor="employee_department"
                  label="Department"
                >
                  <Input id="employee_department" {...form.register("department")} />
                </FormField>
                <FormField
                  error={form.formState.errors.job_title?.message}
                  htmlFor="employee_job_title"
                  label="Job title"
                >
                  <Input id="employee_job_title" {...form.register("job_title")} />
                </FormField>
                <FormField
                  error={form.formState.errors.employment_type?.message}
                  htmlFor="employee_type"
                  label="Employment type"
                >
                  <Select
                    className="w-full"
                    id="employee_type"
                    {...form.register("employment_type")}
                  >
                    <option value="">Not assigned</option>
                    <option value="FULL_TIME">Full time</option>
                    <option value="PART_TIME">Part time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </Select>
                </FormField>
                <FormField
                  error={form.formState.errors.joining_date?.message}
                  htmlFor="employee_joining"
                  label="Joining date"
                >
                  <Input id="employee_joining" type="date" {...form.register("joining_date")} />
                </FormField>
                <div className="md:col-span-2">
                  <FormField
                    error={form.formState.errors.address?.message}
                    htmlFor="employee_address"
                    label="Address"
                  >
                    <Textarea id="employee_address" {...form.register("address")} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <Button disabled={update.isPending} type="submit">
                    {update.isPending ? (
                      <LoaderCircle aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <Save aria-hidden className="size-4" />
                    )}
                    {update.isPending ? "Saving…" : "Save employee"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <ConfirmDialog
            confirmLabel="Deactivate employee"
            description="This account will no longer be able to sign in. Historical HR records are preserved."
            destructive
            onCancel={() => setConfirmDeactivate(false)}
            onConfirm={async () => {
              await deactivate.mutateAsync();
            }}
            open={confirmDeactivate}
            title="Deactivate this employee?"
          />
        </div>
      ) : null}
    </QueryState>
  );
}
