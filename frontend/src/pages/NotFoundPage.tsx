import { Link } from "react-router-dom";

import { routes } from "../app/routes";
import { buttonVariants } from "../components/ui/button-variants";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
      <div>
        <p className="text-sm font-semibold text-indigo-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 text-slate-600">The page may have moved or you may not have access.</p>
        <Link className={`${buttonVariants()} mt-6`} to={routes.home}>
          Return to Dayflow
        </Link>
      </div>
    </main>
  );
}
