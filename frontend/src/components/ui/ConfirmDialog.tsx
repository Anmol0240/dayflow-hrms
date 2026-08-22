import { useState } from "react";

import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useModalAccessibility(open, onCancel, submitting);

  if (!open) return null;
  const confirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-describedby="confirm-description"
      aria-labelledby="confirm-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      ref={dialogRef}
      role="alertdialog"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-950" id="confirm-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="confirm-description">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button disabled={submitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={submitting}
            onClick={() => void confirm()}
            variant={destructive ? "danger" : "primary"}
          >
            {submitting ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
