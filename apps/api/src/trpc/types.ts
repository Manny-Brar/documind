// Types-only export for client consumption
// This file should not import any server-side code

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { appRouter } from "./router.js";

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
