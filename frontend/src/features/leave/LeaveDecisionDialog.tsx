import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { LeaveRequest } from "../../types/domain";

export type LeaveDecision = "approve" | "reject";

interface LeaveDecisionDialogProps {
  decision: LeaveDecision | null;
  request: LeaveRequest | null;
  employeeName: string;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}

export function LeaveDecisionDialog(props: LeaveDecisionDialogProps) {
  if (!props.decision || !props.request) return null;
  return (
    <LeaveDecisionForm
      decision={props.decision}
      employeeName={props.employeeName}
      key={`${props.request.id}-${props.decision}`}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      request={props.request}
    />
  );
}

function LeaveDecisionForm({
  decision,
  request,
  employeeName,
  onClose,
  onSubmit,
}: LeaveDecisionDialogProps & { decision: LeaveDecision; request: LeaveRequest }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reject = decision === "reject";
  const dialogRef = useModalAccessibility(true, onClose, submitting);

  const submit = async () => {
    if (reject && comment.trim().length < 3) {
      setError("Add a reviewer comment explaining the rejection.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(comment.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to review this request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-labelledby="leave-decision-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      ref={dialogRef}
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold text-slate-950" id="leave-decision-title">
              {reject ? "Reject leave request" : "Approve leave request"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {employeeName} · {request.start_date} to {request.end_date}
            </p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          {error ? <Alert>{error}</Alert> : null}
          <FormField
            hint={reject ? "Required for rejected requests" : "Optional"}
            htmlFor="reviewer_comment"
            label="Reviewer comment"
            required={reject}
          >
            <Textarea
              autoFocus
              id="reviewer_comment"
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                reject
                  ? "Explain why this request cannot be approved"
                  : "Add a note for the employee"
              }
              value={comment}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button disabled={submitting} onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={() => void submit()}
              variant={reject ? "danger" : "primary"}
            >
              {submitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              {submitting ? "Saving…" : reject ? "Reject request" : "Approve request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
