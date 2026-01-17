import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { auth } from "./auth.js";
import { validateEnvOrExit } from "./lib/env.js";

// Validate environment at startup
const envConfig = validateEnvOrExit();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
});

async function start() {
  // Register plugins
  await fastify.register(cors, {
    origin: envConfig.config.corsOrigin,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Register tRPC
  await fastify.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  // Health check
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Better Auth handler - mount at /api/auth/*
  // Using Fetch API approach as recommended by Better Auth docs
  fastify.all("/api/auth/*", async (request, reply) => {
    try {
      // Build the full URL
      const protocol = request.protocol;
      const host = request.hostname;
      const port = envConfig.config.port;
      const url = `${protocol}://${host}:${port}${request.url}`;

      // Convert Fastify headers to Headers object
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
      }

      // Create Fetch API compatible request
      const fetchRequest = new Request(url, {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD"
          ? JSON.stringify(request.body)
          : undefined,
      });

      // Call Better Auth handler
      const response = await auth.handler(fetchRequest);

      // Set response status
      reply.status(response.status);

      // Copy response headers
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      // Send response body
      const body = await response.text();
      return reply.send(body);
    } catch (err) {
      fastify.log.error({ err, url: request.url }, "Auth handler error");
      return reply.status(500).send({ error: "Authentication error" });
    }
  });

  // Start server
  const port = envConfig.config.port;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await fastify.listen({ port, host });
    fastify.log.info(`Server running at http://${host}:${port}`);
    fastify.log.info(`GCS Storage: ${envConfig.config.hasGcsCredentials ? "Enabled" : "Fallback Mode"}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
