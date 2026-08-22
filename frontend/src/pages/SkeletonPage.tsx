export function SkeletonPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Dayflow</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          HR operations, in one clear flow.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          The application skeleton is running. Authentication and HR modules will be added in their
          defined implementation phases.
        </p>
      </section>
    </main>
  );
}
