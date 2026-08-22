import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

import { ApiError } from "../../lib/api-client";

export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const message = messages[0];
    if (message) setError(field as FieldPath<T>, { type: "server", message });
  }
  return error.message;
}
