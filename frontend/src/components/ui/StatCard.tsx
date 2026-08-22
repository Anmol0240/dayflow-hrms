import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "./Card";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
          <Icon aria-hidden className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
