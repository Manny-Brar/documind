import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { organizationsRouter } from "./routers/organizations.js";

export const appRouter = router({
  health: healthRouter,
  organizations: organizationsRouter,
});

export type AppRouter = typeof appRouter;
