import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";

import { routes } from "../../app/routes";
import { Card, CardContent } from "../../components/ui/Card";

interface AuthFormCardProps extends PropsWithChildren {
  title: string;
  description: string;
  footer?: ReactNode;
}

export function AuthFormCard({ title, description, footer, children }: AuthFormCardProps) {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <Link
          className="mb-8 inline-flex items-center gap-2 font-semibold text-slate-950 lg:hidden"
          to={routes.home}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
            D
          </span>
          Dayflow
        </Link>
        <p className="text-sm font-medium text-indigo-600">Welcome to Dayflow</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-slate-600">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
