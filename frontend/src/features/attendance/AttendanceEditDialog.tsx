import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Save, X } from "lucide-react";
import { useState } from "react";

import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/use-toast";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import type { AttendanceRecord, AttendanceStatus } from "../../types/domain";
import { attendanceApi } from "./api";

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AttendanceEditDialog({
  record,
  onClose,
}: {
  record: AttendanceRecord | null;
  onClose: () => void;
}) {
  if (!record) return null;
  return <AttendanceEditor key={record.id} onClose={onClose} record={record} />;
}

function AttendanceEditor({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [checkIn, setCheckIn] = useState(() => localDateTime(record.check_in_time));
  const [checkOut, setCheckOut] = useState(() => localDateTime(record.check_out_time));
  const [remarks, setRemarks] = useState(record.remarks ?? "");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const notify = useToast();
  const mutation = useMutation({
    mutationFn: () =>
      attendanceApi.update(record?.id ?? "", {
        status,
        check_in_time: checkIn ? new Date(checkIn).toISOString() : null,
        check_out_time: checkOut ? new Date(checkOut).toISOString() : null,
        remarks: remarks || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      notify({ title: "Attendance corrected", tone: "success" });
      onClose();
    },
    onError: (reason) =>
      setError(reason instanceof Error ? reason.message : "Unable to update attendance"),
  });
  const dialogRef = useModalAccessibility(true, onClose, mutation.isPending);
  return (
    <div
      aria-labelledby="attendance-edit-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"
      ref={dialogRef}
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold text-slate-950" id="attendance-edit-title">
              Correct attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">{record.attendance_date}</p>
          </div>
          <button
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          {error ? <Alert>{error}</Alert> : null}
          <FormField htmlFor="attendance_status" label="Status">
            <Select
              className="w-full"
              id="attendance_status"
              onChange={(event) => setStatus(event.target.value as AttendanceStatus)}
              value={status}
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF_DAY">Half day</option>
              <option value="LEAVE">Leave</option>
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="attendance_check_in" label="Check in">
              <Input
                id="attendance_check_in"
                onChange={(event) => setCheckIn(event.target.value)}
                type="datetime-local"
                value={checkIn}
              />
            </FormField>
            <FormField htmlFor="attendance_check_out" label="Check out">
              <Input
                id="attendance_check_out"
                min={checkIn}
                onChange={(event) => setCheckOut(event.target.value)}
                type="datetime-local"
                value={checkOut}
              />
            </FormField>
          </div>
          <FormField htmlFor="attendance_remarks" label="Correction remarks">
            <Textarea
              id="attendance_remarks"
              maxLength={1000}
              onChange={(event) => setRemarks(event.target.value)}
              value={remarks}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending || Boolean(checkIn && checkOut && checkOut < checkIn)}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden className="size-4" />
              )}
              {mutation.isPending ? "Saving…" : "Save correction"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
