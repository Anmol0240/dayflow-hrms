import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../lib/auth";
import { applyApiErrors } from "./form-errors";
import { AuthFormCard } from "./AuthFormCard";
import { resetPasswordSchema, type ResetPasswordValues } from "./validation";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.get("token") ?? "", password: "", confirm_password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      authApi.resetPassword(values.token, values.password),
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      setMessage((await mutation.mutateAsync(values)).detail);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  return (
    <AuthFormCard
      description="Reset tokens are single-use. Choose a strong password you do not use elsewhere."
      footer={
        <Link className="font-medium text-indigo-700 hover:underline" to={routes.signIn}>
          Return to sign in
        </Link>
      }
      title="Reset password"
    >
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 aria-hidden className="mr-2 inline size-4" />
          {message}
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
          {formError ? <Alert>{formError}</Alert> : null}
          <FormField
            error={form.formState.errors.token?.message}
            htmlFor="reset_token"
            label="Reset token"
            required
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.token)}
              id="reset_token"
              {...form.register("token")}
            />
          </FormField>
          <FormField
            error={form.formState.errors.password?.message}
            hint="At least 12 characters with upper, lower, number, and symbol."
            htmlFor="new_password"
            label="New password"
            required
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.password)}
              autoComplete="new-password"
              id="new_password"
              type="password"
              {...form.register("password")}
            />
          </FormField>
          <FormField
            error={form.formState.errors.confirm_password?.message}
            htmlFor="reset_confirm_password"
            label="Confirm password"
            required
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.confirm_password)}
              autoComplete="new-password"
              id="reset_confirm_password"
              type="password"
              {...form.register("confirm_password")}
            />
          </FormField>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <KeyRound aria-hidden className="size-4" />
            )}
            {mutation.isPending ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      )}
    </AuthFormCard>
  );
}
