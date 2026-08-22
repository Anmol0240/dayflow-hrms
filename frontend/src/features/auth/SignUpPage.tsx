import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../lib/auth";
import { applyApiErrors } from "./form-errors";
import { AuthFormCard } from "./AuthFormCard";
import { signUpSchema, type SignUpValues } from "./validation";

export function SignUpPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      employee_id: "",
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: SignUpValues) =>
      authApi.signup({
        employee_id: values.employee_id,
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: "EMPLOYEE",
      }),
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
      void navigate(routes.verifyEmail, { replace: true, state: { registered: true } });
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  return (
    <AuthFormCard
      description="Create an Employee account. Administrative accounts are provisioned securely by Dayflow administrators."
      footer={
        <>
          Already registered?{" "}
          <Link className="font-medium text-indigo-700 hover:underline" to={routes.signIn}>
            Sign in
          </Link>
        </>
      }
      title="Create your account"
    >
      <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
        {formError ? <Alert>{formError}</Alert> : null}
        <FormField
          error={form.formState.errors.employee_id?.message}
          htmlFor="employee_id"
          label="Employee ID"
          required
        >
          <Input
            aria-invalid={Boolean(form.formState.errors.employee_id)}
            autoComplete="username"
            id="employee_id"
            {...form.register("employee_id")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.full_name?.message}
          htmlFor="full_name"
          label="Full name"
          required
        >
          <Input
            aria-invalid={Boolean(form.formState.errors.full_name)}
            autoComplete="name"
            id="full_name"
            {...form.register("full_name")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.email?.message}
          htmlFor="signup_email"
          label="Work email"
          required
        >
          <Input
            aria-invalid={Boolean(form.formState.errors.email)}
            autoComplete="email"
            id="signup_email"
            type="email"
            {...form.register("email")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.password?.message}
          hint="At least 12 characters with upper, lower, number, and symbol."
          htmlFor="signup_password"
          label="Password"
          required
        >
          <Input
            aria-invalid={Boolean(form.formState.errors.password)}
            autoComplete="new-password"
            id="signup_password"
            type="password"
            {...form.register("password")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.confirm_password?.message}
          htmlFor="confirm_password"
          label="Confirm password"
          required
        >
          <Input
            aria-invalid={Boolean(form.formState.errors.confirm_password)}
            autoComplete="new-password"
            id="confirm_password"
            type="password"
            {...form.register("confirm_password")}
          />
        </FormField>
        <Button className="w-full" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <UserPlus aria-hidden className="size-4" />
          )}
          {mutation.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthFormCard>
  );
}
