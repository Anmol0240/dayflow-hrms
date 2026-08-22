import { createContext } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);
