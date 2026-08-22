import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Calendar, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { routes } from "../../app/routes";
import { PageHeader } from "../../components/layout/PageHeader";
import { buttonVariants } from "../../components/ui/button-variants";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { QueryState } from "../../components/ui/QueryState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDate } from "../../lib/format";
import { employeesApi } from "./api";

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon aria-hidden className="size-4" />
      </span>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-1 text-sm text-slate-900">{value || "Not provided"}</dd>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const profile = useQuery({ queryKey: ["employees", "me"], queryFn: employeesApi.me });
  return (
    <QueryState
      error={profile.error}
      isLoading={profile.isLoading}
      onRetry={() => void profile.refetch()}
    >
      {profile.data ? (
        <div className="space-y-6">
          <PageHeader
            actions={
              <Link className={buttonVariants()} to={routes.editProfile}>
                <Pencil aria-hidden className="size-4" />
                Edit profile
              </Link>
            }
            description="Your personal contact and employment information in Dayflow."
            eyebrow="Employee profile"
            title="My profile"
          />
          <Card>
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-100 text-2xl font-semibold text-indigo-700">
                {profile.data.profile_picture_url ? (
                  <img
                    alt={`${profile.data.full_name} profile`}
                    className="size-full object-cover"
                    src={profile.data.profile_picture_url}
                  />
                ) : (
                  profile.data.full_name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold text-slate-950">
                    {profile.data.full_name}
                  </h3>
                  <StatusBadge status={profile.data.is_active ? "ACTIVE" : "INACTIVE"} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {profile.data.job_title ?? "Job title not assigned"}
                  {profile.data.department ? ` · ${profile.data.department}` : ""}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Employee ID: {profile.data.employee_id}
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Personal information</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-6 sm:grid-cols-2">
                  <Detail icon={Mail} label="Email" value={profile.data.email} />
                  <Detail icon={Phone} label="Phone" value={profile.data.phone} />
                  <Detail icon={MapPin} label="Address" value={profile.data.address} />
                  <Detail
                    icon={Calendar}
                    label="Date of birth"
                    value={
                      profile.data.date_of_birth ? formatDate(profile.data.date_of_birth) : null
                    }
                  />
                  <Detail
                    icon={UserRound}
                    label="Gender"
                    value={profile.data.gender?.replaceAll("_", " ")}
                  />
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-950">Employment information</h3>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-6 sm:grid-cols-2">
                  <Detail
                    icon={BriefcaseBusiness}
                    label="Department"
                    value={profile.data.department}
                  />
                  <Detail
                    icon={BriefcaseBusiness}
                    label="Job title"
                    value={profile.data.job_title}
                  />
                  <Detail
                    icon={BriefcaseBusiness}
                    label="Employment type"
                    value={profile.data.employment_type?.replaceAll("_", " ")}
                  />
                  <Detail
                    icon={Calendar}
                    label="Joining date"
                    value={profile.data.joining_date ? formatDate(profile.data.joining_date) : null}
                  />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </QueryState>
  );
}
