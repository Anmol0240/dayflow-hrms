import type { LucideIcon } from "lucide-react";
import { ArrowRight, Boxes } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent } from "../components/ui/Card";
import { buttonVariants } from "../components/ui/button-variants";

interface FoundationPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: { label: string; to: string };
}

export function FoundationPage({
  title,
  description,
  icon: Icon = Boxes,
  action,
}: FoundationPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">Dayflow workspace</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
      </div>
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <Icon aria-hidden className="size-6" />
          </span>
          <h3 className="mt-4 font-semibold text-slate-950">Foundation ready</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Routing, authorization, responsive layout, loading behavior, and API boundaries are
            active. Feature-specific data and interactions are implemented in Phase 7.
          </p>
          {action ? (
            <Link className={`${buttonVariants({ variant: "primary" })} mt-5`} to={action.to}>
              {action.label}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
