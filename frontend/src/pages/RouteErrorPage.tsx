import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import { routes } from "../app/routes";
import { Alert } from "../components/ui/Alert";
import { buttonVariants } from "../components/ui/button-variants";

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? error.statusText : "The page could not be loaded.";
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <Alert>
          <strong>Something went wrong.</strong>
          <p className="mt-1">{message}</p>
        </Alert>
        <Link className={`${buttonVariants()} mt-5`} to={routes.home}>
          Return to Dayflow
        </Link>
      </div>
    </main>
  );
}
