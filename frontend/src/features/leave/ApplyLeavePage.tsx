import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { buttonVariants } from "../../components/ui/button-variants";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/use-toast";
import { toDateInput } from "../../lib/date";
import { applyApiErrors } from "../auth/form-errors";
import { leaveApi } from "./api";

const schema = z
  .object({
    leave_type: z.enum(["PAID", "SICK", "UNPAID"]),
    start_date: z.string().min(1, "Choose a start date"),
    end_date: z.string().min(1, "Choose an end date"),
    reason: z.string().trim().min(3, "Give a brief reason").max(2000),
    employee_remarks: z.string().trim().max(1000),
  })
  .refine(
    (values) => !values.start_date || !values.end_date || values.end_date >= values.start_date,
    { message: "End date cannot be before start date", path: ["end_date"] },
  );
type Values = z.infer<typeof schema>;

export function ApplyLeavePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      leave_type: "PAID",
      start_date: toDateInput(new Date()),
      end_date: toDateInput(new Date()),
      reason: "",
      employee_remarks: "",
    },
  });
  const start = useWatch({ control: form.control, name: "start_date" });
  const end = useWatch({ control: form.control, name: "end_date" });
  const numberOfDays =
    start && end && end >= start
      ? Math.floor(
          (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) /
            86_400_000,
        ) + 1
      : 0;
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      leaveApi.create({ ...values, employee_remarks: values.employee_remarks || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      notify({ title: "Leave request submitted", tone: "success" });
      void navigate(routes.leaveRequests);
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "secondary" })} to={routes.leaveRequests}>
            <ArrowLeft aria-hidden className="size-4" />
            My requests
          </Link>
        }
        description="Choose a leave type and inclusive date range for HR review."
        eyebrow="Time off"
        title="Apply for leave"
      />
      <Card>
        <CardContent className="max-w-2xl">
          <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
            {formError ? <Alert>{formError}</Alert> : null}
            <FormField
              error={form.formState.errors.leave_type?.message}
              htmlFor="leave_type"
              label="Leave type"
              required
            >
              <Select className="w-full" id="leave_type" {...form.register("leave_type")}>
                <option value="PAID">Paid leave</option>
                <option value="SICK">Sick leave</option>
                <option value="UNPAID">Unpaid leave</option>
              </Select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                error={form.formState.errors.start_date?.message}
                htmlFor="leave_start"
                label="Start date"
                required
              >
                <Input id="leave_start" type="date" {...form.register("start_date")} />
              </FormField>
              <FormField
                error={form.formState.errors.end_date?.message}
                hint={
                  numberOfDays
                    ? `${String(numberOfDays)} calendar day${numberOfDays === 1 ? "" : "s"}`
                    : undefined
                }
                htmlFor="leave_end"
                label="End date"
                required
              >
                <Input id="leave_end" min={start} type="date" {...form.register("end_date")} />
              </FormField>
            </div>
            <FormField
              error={form.formState.errors.reason?.message}
              htmlFor="leave_reason"
              label="Reason"
              required
            >
              <Textarea
                id="leave_reason"
                placeholder="Briefly explain the reason for this request"
                {...form.register("reason")}
              />
            </FormField>
            <FormField
              error={form.formState.errors.employee_remarks?.message}
              htmlFor="leave_remarks"
              label="Additional remarks"
            >
              <Textarea id="leave_remarks" {...form.register("employee_remarks")} />
            </FormField>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <CalendarPlus aria-hidden className="size-4" />
              )}
              {mutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
