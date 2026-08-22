import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-600"
      role="status"
    >
      <LoaderCircle aria-hidden className="size-5 animate-spin text-indigo-600" />
      <span>{label}</span>
    </div>
  );
}
