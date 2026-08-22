import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { PublicLayout } from "../components/layout/PublicLayout";
import { LoadingState } from "../components/ui/LoadingState";
import { PublicOnly, RequireAuth, RequireRole, RoleLanding } from "../features/auth/route-guards";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { routes } from "./routes";

export const routeObjects: RouteObject[] = [
  {
    HydrateFallback: LoadingState,
    element: <PublicOnly />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: routes.signIn,
            lazy: async () => ({
              Component: (await import("../features/auth/SignInPage")).SignInPage,
            }),
          },
          {
            path: routes.signUp,
            lazy: async () => ({
              Component: (await import("../features/auth/SignUpPage")).SignUpPage,
            }),
          },
          {
            path: routes.verifyEmail,
            lazy: async () => ({
              Component: (await import("../features/auth/VerifyEmailPage")).VerifyEmailPage,
            }),
          },
          {
            path: routes.forgotPassword,
            lazy: async () => ({
              Component: (await import("../features/auth/ForgotPasswordPage")).ForgotPasswordPage,
            }),
          },
          {
            path: routes.resetPassword,
            lazy: async () => ({
              Component: (await import("../features/auth/ResetPasswordPage")).ResetPasswordPage,
            }),
          },
        ],
      },
    ],
  },
  {
    HydrateFallback: LoadingState,
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: routes.home, element: <RoleLanding /> },
          {
            path: routes.profile,
            lazy: async () => ({
              Component: (await import("../features/employees/ProfilePage")).ProfilePage,
            }),
          },
          {
            path: routes.editProfile,
            lazy: async () => ({
              Component: (await import("../features/employees/EditProfilePage")).EditProfilePage,
            }),
          },
          {
            path: routes.notifications,
            lazy: async () => ({
              Component: (await import("../features/notifications/NotificationsPage"))
                .NotificationsPage,
            }),
          },
          {
            element: <RequireRole roles={["EMPLOYEE"]} />,
            children: [
              {
                path: routes.employeeDashboard,
                lazy: async () => ({
                  Component: (await import("../features/dashboard/EmployeeDashboardPage"))
                    .EmployeeDashboardPage,
                }),
              },
              {
                path: routes.attendance,
                lazy: async () => ({
                  Component: (await import("../features/attendance/EmployeeAttendancePage"))
                    .EmployeeAttendancePage,
                }),
              },
              {
                path: routes.applyLeave,
                lazy: async () => ({
                  Component: (await import("../features/leave/ApplyLeavePage")).ApplyLeavePage,
                }),
              },
              {
                path: routes.leaveRequests,
                lazy: async () => ({
                  Component: (await import("../features/leave/EmployeeLeavePage"))
                    .EmployeeLeavePage,
                }),
              },
              {
                path: routes.payroll,
                lazy: async () => ({
                  Component: (await import("../features/payroll/EmployeePayrollPage"))
                    .EmployeePayrollPage,
                }),
              },
            ],
          },
          {
            element: <RequireRole roles={["ADMIN", "HR"]} />,
            children: [
              {
                path: routes.adminDashboard,
                lazy: async () => ({
                  Component: (await import("../features/dashboard/AdminDashboardPage"))
                    .AdminDashboardPage,
                }),
              },
              {
                path: routes.employees,
                lazy: async () => ({
                  Component: (await import("../features/employees/EmployeeManagementPage"))
                    .EmployeeManagementPage,
                }),
              },
              {
                path: routes.employeeDetails,
                lazy: async () => ({
                  Component: (await import("../features/employees/EmployeeDetailsPage"))
                    .EmployeeDetailsPage,
                }),
              },
              {
                path: routes.adminAttendance,
                lazy: async () => ({
                  Component: (await import("../features/attendance/AdminAttendancePage"))
                    .AdminAttendancePage,
                }),
              },
              {
                path: routes.leaveApprovals,
                lazy: async () => ({
                  Component: (await import("../features/leave/AdminLeavePage")).AdminLeavePage,
                }),
              },
              {
                path: routes.adminPayroll,
                lazy: async () => ({
                  Component: (await import("../features/payroll/AdminPayrollPage"))
                    .AdminPayrollPage,
                }),
              },
              {
                path: routes.reports,
                lazy: async () => ({
                  Component: (await import("../features/reports/ReportsPage")).ReportsPage,
                }),
              },
              {
                path: routes.adminNotifications,
                lazy: async () => ({
                  Component: (await import("../features/notifications/NotificationsPage"))
                    .NotificationsPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routeObjects, { window });
