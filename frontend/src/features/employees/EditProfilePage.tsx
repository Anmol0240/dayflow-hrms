import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { QueryState } from "../../components/ui/QueryState";
import { useToast } from "../../components/ui/use-toast";
import { applyApiErrors } from "../auth/form-errors";
import { employeesApi } from "./api";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .refine((value) => !value || value.length >= 5, "Enter at least 5 characters")
    .refine((value) => value.length <= 32, "Use at most 32 characters"),
  address: z.string().trim().max(1000, "Use at most 1000 characters"),
  profile_picture_url: z.union([z.url("Enter a valid URL"), z.literal("")]),
});
type Values = z.infer<typeof schema>;

export function EditProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const profile = useQuery({ queryKey: ["employees", "me"], queryFn: employeesApi.me });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", address: "", profile_picture_url: "" },
  });
  useEffect(() => {
    if (profile.data)
      form.reset({
        phone: profile.data.phone ?? "",
        address: profile.data.address ?? "",
        profile_picture_url: profile.data.profile_picture_url ?? "",
      });
  }, [form, profile.data]);
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      employeesApi.updateMe({
        phone: values.phone || null,
        address: values.address || null,
        profile_picture_url: values.profile_picture_url || null,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["employees", "me"], updated);
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "employee"] });
      notify({ title: "Profile updated", tone: "success" });
      void navigate(routes.profile);
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
    <QueryState error={profile.error} isLoading={profile.isLoading}>
      {profile.data ? (
        <div className="space-y-6">
          <PageHeader
            actions={
              <Link className={buttonVariants({ variant: "secondary" })} to={routes.profile}>
                <ArrowLeft aria-hidden className="size-4" />
                Back to profile
              </Link>
            }
            description="Employees can update only profile picture, phone number, and address. Contact HR for employment changes."
            eyebrow="Self-service"
            title="Edit profile"
          />
          <Card>
            <CardContent className="max-w-2xl">
              <form className="space-y-5" noValidate onSubmit={(event) => void submit(event)}>
                {formError ? <Alert>{formError}</Alert> : null}
                <FormField
                  error={form.formState.errors.profile_picture_url?.message}
                  hint="Use an HTTPS image URL."
                  htmlFor="profile_picture_url"
                  label="Profile picture URL"
                >
                  <Input
                    id="profile_picture_url"
                    type="url"
                    {...form.register("profile_picture_url")}
                  />
                </FormField>
                <FormField
                  error={form.formState.errors.phone?.message}
                  htmlFor="phone"
                  label="Phone number"
                >
                  <Input autoComplete="tel" id="phone" type="tel" {...form.register("phone")} />
                </FormField>
                <FormField
                  error={form.formState.errors.address?.message}
                  htmlFor="address"
                  label="Address"
                >
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    id="address"
                    {...form.register("address")}
                  />
                </FormField>
                <Button disabled={mutation.isPending} type="submit">
                  {mutation.isPending ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Save aria-hidden className="size-4" />
                  )}
                  {mutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </QueryState>
  );
}
