export type UserRole = "ADMIN" | "HR" | "EMPLOYEE";

export interface User {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface ApiErrorPayload {
  detail: string;
  code: string;
  field_errors: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  pages: number;
}
