import type { PaginationMeta, UserRole } from "./index";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type LeaveType = "PAID" | "SICK" | "UNPAID";

export interface EmployeeProfile {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  full_name: string;
  profile_picture_url: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  department: string | null;
  job_title: string | null;
  employment_type: string | null;
  joining_date: string | null;
  manager_id: string | null;
  emergency_contact: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  work_duration: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceList {
  items: AttendanceRecord[];
  pagination: PaginationMeta;
}

export interface AttendanceSummary {
  start_date: string;
  end_date: string;
  total: number;
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  total_work_duration: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string;
  status: LeaveStatus;
  employee_remarks: string | null;
  reviewer_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveList {
  items: LeaveRequest[];
  pagination: PaginationMeta;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  effective_from: string;
  basic_salary: string;
  allowances: string;
  deductions: string;
  gross_salary: string;
  net_salary: string;
  currency: string;
  payslip_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollList {
  items: PayrollRecord[];
  pagination: PaginationMeta;
}

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationList {
  items: NotificationRecord[];
  unread_count: number;
  pagination: PaginationMeta;
}

export interface EmployeeDashboard {
  full_name: string;
  profile_completion: number;
  checked_in_today: boolean;
  checked_out_today: boolean;
  pending_leave_requests: number;
  approved_leave_days: number;
  latest_net_salary: string | null;
  unread_notifications: number;
}

export interface AdminDashboard {
  total_employees: number;
  active_employees: number;
  present_today: number;
  employees_on_leave: number;
  pending_leave_requests: number;
  department_distribution: Record<string, number>;
}

export interface AttendanceReport {
  start_date: string;
  end_date: string;
  total_records: number;
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  total_work_duration: number;
}

export interface LeaveReport {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  approved_days: number;
}

export interface PayrollReport {
  record_count: number;
  total_gross: string;
  total_net: string;
  currency: string | null;
}
