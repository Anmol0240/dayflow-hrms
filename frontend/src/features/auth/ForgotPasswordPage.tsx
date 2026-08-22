import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../lib/auth";
import { applyApiErrors } from "./form-errors";
import { AuthFormCard } from "./AuthFormCard";
import { emailSchema, type EmailValues } from "./validation";

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: EmailValues) => authApi.forgotPassword(values.email),
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
      description="Enter your work email. For privacy, the response is the same whether an account exists or not."
      footer={
        <Link className="font-medium text-indigo-700 hover:underline" to={routes.signIn}>
          Return to sign in
        </Link>
      }
      title="Forgot password"
    >
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          <CheckCircle2 aria-hidden className="mr-2 inline size-4" />
          {message}
        </div>
      ) : (
        <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
          {formError ? <Alert>{formError}</Alert> : null}
          <FormField
            error={form.formState.errors.email?.message}
            htmlFor="recovery_email"
            label="Work email"
            required
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.email)}
              autoComplete="email"
              id="recovery_email"
              type="email"
              {...form.register("email")}
            />
          </FormField>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <Send aria-hidden className="size-4" />
            )}
            {mutation.isPending ? "Sending…" : "Send reset instructions"}
          </Button>
        </form>
      )}
    </AuthFormCard>
  );
}
