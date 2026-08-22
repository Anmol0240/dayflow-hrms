import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  PieChart,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { routes } from "../../app/routes";
import type { UserRole } from "../../types";

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const employeeNavigation: NavigationItem[] = [
  { label: "Dashboard", to: routes.employeeDashboard, icon: LayoutDashboard },
  { label: "My profile", to: routes.profile, icon: UserRound },
  { label: "Attendance", to: routes.attendance, icon: CalendarCheck },
  { label: "Leave", to: routes.leaveRequests, icon: CalendarDays },
  { label: "Payroll", to: routes.payroll, icon: CircleDollarSign },
  { label: "Notifications", to: routes.notifications, icon: Bell },
];

const adminNavigation: NavigationItem[] = [
  { label: "Dashboard", to: routes.adminDashboard, icon: LayoutDashboard },
  { label: "Employees", to: routes.employees, icon: UsersRound },
  { label: "Attendance", to: routes.adminAttendance, icon: CalendarCheck },
  { label: "Leave approvals", to: routes.leaveApprovals, icon: ClipboardCheck },
  { label: "Payroll", to: routes.adminPayroll, icon: CircleDollarSign },
  { label: "Reports", to: routes.reports, icon: PieChart },
  { label: "Notifications", to: routes.adminNotifications, icon: Bell },
];

export function navigationForRole(role: UserRole): NavigationItem[] {
  return role === "EMPLOYEE" ? employeeNavigation : adminNavigation;
}
