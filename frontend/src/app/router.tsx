import { createBrowserRouter } from "react-router-dom";

import { SkeletonPage } from "../pages/SkeletonPage";
import { routes } from "./routes";

export const router = createBrowserRouter([
  {
    path: routes.home,
    element: <SkeletonPage />,
  },
]);
