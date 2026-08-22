import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "../../components/ui/LoadingState";
import { routes } from "../../app/routes";
import type { UserRole } from "../../types";
import { useAuth } from "./use-auth";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "initializing") return <LoadingState label="Restoring your session" />;
  if (status === "unauthenticated") {
    return <Navigate replace state={{ from: location.pathname }} to={routes.signIn} />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: readonly UserRole[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <Navigate
        replace
        to={user?.role === "EMPLOYEE" ? routes.employeeDashboard : routes.adminDashboard}
      />
    );
  }
  return <Outlet />;
}

export function PublicOnly() {
  const { status, user } = useAuth();
  if (status === "initializing") return <LoadingState label="Restoring your session" />;
  if (user) {
    return (
      <Navigate
        replace
        to={user.role === "EMPLOYEE" ? routes.employeeDashboard : routes.adminDashboard}
      />
    );
  }
  return <Outlet />;
}

export function RoleLanding() {
  const { user } = useAuth();
  return (
    <Navigate
      replace
      to={user?.role === "EMPLOYEE" ? routes.employeeDashboard : routes.adminDashboard}
    />
  );
}
