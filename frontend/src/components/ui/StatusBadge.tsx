import { Badge } from "./Badge";

const tones = {
  PRESENT: "success",
  APPROVED: "success",
  ACTIVE: "success",
  PENDING: "warning",
  HALF_DAY: "warning",
  REJECTED: "danger",
  ABSENT: "danger",
  CANCELLED: "neutral",
  LEAVE: "info",
  PAID: "info",
  SICK: "warning",
  UNPAID: "neutral",
} as const;

export function StatusBadge({ status }: { status: string }) {
  const tone = tones[status as keyof typeof tones] ?? "neutral";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
