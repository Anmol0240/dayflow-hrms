import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/use-toast";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { UserRole } from "../../types";
import { applyApiErrors } from "../auth/form-errors";
import { employeesApi } from "./api";

const schema = z.object({
  employee_id: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, numbers, hyphens, or underscores"),
  full_name: z.string().trim().min(2).max(200),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  role: z.enum(["EMPLOYEE", "HR"]),
  department: z.string().trim().max(120),
  job_title: z.string().trim().max(160),
  employment_type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  joining_date: z.string(),
});
type Values = z.infer<typeof schema>;

export function EmployeeCreateDialog({
  open,
  actorRole,
  onClose,
}: {
  open: boolean;
  actorRole: UserRole;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_id: "",
      full_name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      department: "",
      job_title: "",
      employment_type: "FULL_TIME",
      joining_date: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      employeesApi.create({
        ...values,
        department: values.department || null,
        job_title: values.job_title || null,
        joining_date: values.joining_date || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
      notify({ title: "Employee created", tone: "success" });
      form.reset();
      onClose();
    },
  });
  const dialogRef = useModalAccessibility(open, onClose, mutation.isPending);
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  if (!open) return null;
  return (
    <div
      aria-labelledby="create-employee-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 sm:p-8"
      ref={dialogRef}
      role="dialog"
    >
      <div className="mx-auto w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950" id="create-employee-title">
              Add employee
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Creates a verified account and employee profile.
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <form
          className="grid gap-5 p-5 sm:grid-cols-2"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          {formError ? (
            <div className="sm:col-span-2">
              <Alert>{formError}</Alert>
            </div>
          ) : null}
          <FormField
            error={form.formState.errors.employee_id?.message}
            htmlFor="new_employee_id"
            label="Employee ID"
            required
          >
            <Input autoFocus id="new_employee_id" {...form.register("employee_id")} />
          </FormField>
          <FormField
            error={form.formState.errors.full_name?.message}
            htmlFor="new_full_name"
            label="Full name"
            required
          >
            <Input id="new_full_name" {...form.register("full_name")} />
          </FormField>
          <FormField
            error={form.formState.errors.email?.message}
            htmlFor="new_email"
            label="Email"
            required
          >
            <Input id="new_email" type="email" {...form.register("email")} />
          </FormField>
          <FormField
            error={form.formState.errors.password?.message}
            hint="12+ characters with upper, lower, number, symbol."
            htmlFor="new_password"
            label="Temporary password"
            required
          >
            <Input id="new_password" type="password" {...form.register("password")} />
          </FormField>
          <FormField
            error={form.formState.errors.role?.message}
            htmlFor="new_role"
            label="Role"
            required
          >
            <Select className="w-full" id="new_role" {...form.register("role")}>
              <option value="EMPLOYEE">Employee</option>
              {actorRole === "ADMIN" ? <option value="HR">HR</option> : null}
            </Select>
          </FormField>
          <FormField
            error={form.formState.errors.employment_type?.message}
            htmlFor="new_employment_type"
            label="Employment type"
          >
            <Select
              className="w-full"
              id="new_employment_type"
              {...form.register("employment_type")}
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </Select>
          </FormField>
          <FormField
            error={form.formState.errors.department?.message}
            htmlFor="new_department"
            label="Department"
          >
            <Input id="new_department" {...form.register("department")} />
          </FormField>
          <FormField
            error={form.formState.errors.job_title?.message}
            htmlFor="new_job_title"
            label="Job title"
          >
            <Input id="new_job_title" {...form.register("job_title")} />
          </FormField>
          <FormField
            error={form.formState.errors.joining_date?.message}
            htmlFor="new_joining_date"
            label="Joining date"
          >
            <Input id="new_joining_date" type="date" {...form.register("joining_date")} />
          </FormField>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <UserPlus aria-hidden className="size-4" />
              )}
              {mutation.isPending ? "Creating…" : "Create employee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
