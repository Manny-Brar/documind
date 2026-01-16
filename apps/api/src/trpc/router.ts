import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";

export const appRouter = router({
  health: healthRouter,
  // TODO: Add more routers
  // auth: authRouter,
  // documents: documentsRouter,
  // search: searchRouter,
  // team: teamRouter,
  // settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
