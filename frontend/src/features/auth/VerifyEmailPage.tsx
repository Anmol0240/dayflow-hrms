import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { routes } from "../../app/routes";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../lib/auth";
import { applyApiErrors } from "./form-errors";
import { AuthFormCard } from "./AuthFormCard";
import { tokenSchema, type TokenValues } from "./validation";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TokenValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: params.get("token") ?? "" },
  });
  const mutation = useMutation({
    mutationFn: (values: TokenValues) => authApi.verifyEmail(values.token),
  });
  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      setMessage((await mutation.mutateAsync(values)).detail);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError));
    }
  });
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);
  return (
    <AuthFormCard
      description="Confirm the token from your verification email before signing in."
      footer={
        <Link className="font-medium text-indigo-700 hover:underline" to={routes.signIn}>
          Return to sign in
        </Link>
      }
      title="Verify your email"
    >
      {registered ? (
        <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          <MailCheck aria-hidden className="mr-2 inline size-4" />
          Account created. Check your email for a verification token.
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 aria-hidden className="mr-2 inline size-4" />
          {message}
        </div>
      ) : (
        <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
          {formError ? <Alert>{formError}</Alert> : null}
          <FormField
            error={form.formState.errors.token?.message}
            hint="Tokens are single-use and expire after 24 hours."
            htmlFor="verification_token"
            label="Verification token"
            required
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.token)}
              autoComplete="one-time-code"
              id="verification_token"
              {...form.register("token")}
            />
          </FormField>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <MailCheck aria-hidden className="size-4" />
            )}
            {mutation.isPending ? "Verifying…" : "Verify email"}
          </Button>
        </form>
      )}
    </AuthFormCard>
  );
}
