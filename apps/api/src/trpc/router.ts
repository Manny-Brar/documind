import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { organizationsRouter } from "./routers/organizations.js";
import { documentsRouter } from "./routers/documents.js";
import { searchRouter } from "./routers/search.js";
import { settingsRouter } from "./routers/settings.js";
import { apiKeysRouter } from "./routers/api-keys.js";
import { billingRouter } from "./routers/billing.js";
import { entitiesRouter } from "./routers/entities.js";
import { queueRouter } from "./routers/queue.js";
import { slackRouter } from "./routers/slack.js";

export const appRouter = router({
  health: healthRouter,
  organizations: organizationsRouter,
  documents: documentsRouter,
  search: searchRouter,
  settings: settingsRouter,
  apiKeys: apiKeysRouter,
  billing: billingRouter,
  entities: entitiesRouter,
  queue: queueRouter,
  slack: slackRouter,
});

export type AppRouter = typeof appRouter;
