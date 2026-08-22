import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "./use-auth";
import { applyApiErrors } from "./form-errors";
import { AuthFormCard } from "./AuthFormCard";
import { loginSchema, type LoginValues } from "./validation";

export function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({ mutationFn: login });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const currentUser = await mutation.mutateAsync(values);
      const requested = (location.state as { from?: string } | null)?.from;
      const fallback =
        currentUser.role === "EMPLOYEE" ? routes.employeeDashboard : routes.adminDashboard;
      void navigate(requested ?? fallback, { replace: true });
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });

  return (
    <AuthFormCard
      description="Enter your verified work account to continue."
      footer={
        <>
          New to Dayflow?{" "}
          <Link className="font-medium text-indigo-700 hover:underline" to={routes.signUp}>
            Create an account
          </Link>
        </>
      }
      title="Sign in"
    >
      <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
        {formError ? <Alert>{formError}</Alert> : null}
        <FormField
          error={form.formState.errors.email?.message}
          htmlFor="email"
          label="Work email"
          required
        >
          <Input
            aria-describedby="email-message"
            aria-invalid={Boolean(form.formState.errors.email)}
            autoComplete="email"
            id="email"
            placeholder="you@company.com"
            type="email"
            {...form.register("email")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.password?.message}
          htmlFor="password"
          label="Password"
          required
        >
          <Input
            aria-describedby="password-message"
            aria-invalid={Boolean(form.formState.errors.password)}
            autoComplete="current-password"
            id="password"
            type="password"
            {...form.register("password")}
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            className="text-sm font-medium text-indigo-700 hover:underline"
            to={routes.forgotPassword}
          >
            Forgot password?
          </Link>
        </div>
        <Button className="w-full" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <ArrowRight aria-hidden className="size-4" />
          )}
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthFormCard>
  );
}
