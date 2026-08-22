import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { routes } from "../../app/routes";
import { useAuth } from "../../features/auth/use-auth";
import { notificationsApi } from "../../features/notifications/api";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { navigationForRole } from "./navigation";

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const notifications = useQuery({
    queryKey: ["notifications", 1],
    queryFn: () => notificationsApi.list(1),
    staleTime: 60_000,
  });
  if (!user) return null;
  const navigation = navigationForRole(user.role);
  const current = [...navigation]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname.startsWith(item.to));

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link className="flex items-center gap-3 font-semibold text-slate-950" to={routes.home}>
          <span className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white">
            D
          </span>
          <span>Dayflow</span>
        </Link>
        <button
          aria-label="Close navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  isActive && "bg-indigo-50 text-indigo-700",
                )
              }
              key={item.to}
              onClick={() => setMobileOpen(false)}
              to={item.to}
            >
              <Icon aria-hidden className="size-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {user.full_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-950">{user.full_name}</p>
            <Badge className="mt-1" tone="info">
              {user.role === "EMPLOYEE" ? "Employee" : user.role}
            </Badge>
          </div>
        </div>
        <Button className="w-full justify-start" onClick={() => void logout()} variant="ghost">
          <LogOut aria-hidden className="size-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebar}
      </aside>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        >
          <aside
            className="flex h-full w-72 flex-col bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            aria-label="Open navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Dayflow / {current?.label ?? "Workspace"}</p>
            <h1 className="truncate text-lg font-semibold text-slate-950">
              {current?.label ?? "Workspace"}
            </h1>
          </div>
          <Link
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            to={user.role === "EMPLOYEE" ? routes.notifications : routes.adminNotifications}
          >
            <Bell aria-hidden className="size-5" />
            {notifications.data?.unread_count ? (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            ) : null}
          </Link>
        </header>
        <main className="mx-auto max-w-[100rem] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
