import { z } from "zod";

const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z
  .object({
    employee_id: z
      .string()
      .trim()
      .min(3, "Employee ID must have at least 3 characters")
      .max(32, "Employee ID must have at most 32 characters")
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, numbers, hyphens, or underscores"),
    full_name: z.string().trim().min(2, "Enter your full name").max(200),
    email: z.email("Enter a valid email address"),
    password,
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const emailSchema = z.object({ email: z.email("Enter a valid email address") });

export const tokenSchema = z.object({
  token: z.string().min(32, "Enter a valid verification token"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, "Enter a valid reset token"),
    password,
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
export type TokenValues = z.infer<typeof tokenSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
