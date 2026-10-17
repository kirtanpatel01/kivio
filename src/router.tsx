import {
  createRouter as createTanStackRouter,
  ErrorComponent,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import { queryClient } from "./lib/query";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: false,
    defaultPreloadStaleTime: 30_000,

    defaultErrorComponent: ({ error }) => <ErrorComponent error={error} />,
  });

  return router;
}

declare module "@tanstack/react-start" {
  interface Register {
    ssr: true;
    router: ReturnType<typeof getRouter>;
  }
}
