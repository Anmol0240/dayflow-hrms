import { CircleAlert } from "lucide-react";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Alert({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800",
        className,
      )}
      role="alert"
      {...props}
    >
      <CircleAlert aria-hidden className="size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
