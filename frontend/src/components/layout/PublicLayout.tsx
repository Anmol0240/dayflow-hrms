import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="hidden bg-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="text-xl font-semibold">Dayflow</div>
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-200">
            People operations
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            Work should flow. People should thrive.
          </h1>
          <p className="mt-6 text-lg leading-8 text-indigo-100">
            A secure, focused workspace for attendance, leave, payroll, and the moments that keep a
            team moving.
          </p>
        </div>
        <p className="text-sm text-indigo-200">Secure HR operations for modern teams.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
