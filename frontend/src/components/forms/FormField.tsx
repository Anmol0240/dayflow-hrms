import { cloneElement, isValidElement, type ReactNode } from "react";

interface AccessibleControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

interface FormFieldProps {
  children: ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  htmlFor: string;
  label: string;
  required?: boolean | undefined;
}

export function FormField({ children, error, hint, htmlFor, label, required }: FormFieldProps) {
  const messageId = `${htmlFor}-message`;
  const describedBy = [
    isValidElement<AccessibleControlProps>(children)
      ? children.props["aria-describedby"]
      : undefined,
    error || hint ? messageId : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const control = isValidElement<AccessibleControlProps>(children)
    ? cloneElement(children, {
        ...(describedBy && { "aria-describedby": describedBy }),
        ...(error && { "aria-invalid": true }),
        ...(required && { "aria-required": true }),
      })
    : children;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </label>
      {control}
      {error ? (
        <p className="mt-1.5 text-sm text-red-700" id={messageId}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500" id={messageId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
