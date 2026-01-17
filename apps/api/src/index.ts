import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import rawBody from "fastify-raw-body";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { auth } from "./auth.js";
import { validateEnvOrExit } from "./lib/env.js";
import { prisma } from "@documind/db";
import {
  isStripeConfigured,
  verifyWebhookSignature,
  handleWebhookEvent,
} from "./lib/stripe.js";

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

  // Register raw body for Stripe webhooks
  await fastify.register(rawBody, {
    field: "rawBody",
    global: false, // Only add to routes that need it
    runFirst: true,
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

  // Stripe webhook handler
  fastify.post(
    "/api/webhooks/stripe",
    {
      config: {
        rawBody: true, // Enable raw body for this route
      },
    },
    async (request, reply) => {
      // Check if Stripe is configured
      if (!isStripeConfigured()) {
        fastify.log.warn("Stripe webhook received but Stripe is not configured");
        return reply.status(400).send({ error: "Stripe not configured" });
      }

      const signature = request.headers["stripe-signature"] as string;
      if (!signature) {
        fastify.log.warn("Stripe webhook missing signature");
        return reply.status(400).send({ error: "Missing stripe-signature header" });
      }

      try {
        // Get raw body for signature verification
        const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;
        if (!rawBody) {
          fastify.log.error("Raw body not available for Stripe webhook");
          return reply.status(400).send({ error: "Raw body not available" });
        }

        // Verify signature and get event
        const event = verifyWebhookSignature(rawBody, signature);

        fastify.log.info({ type: event.type, id: event.id }, "Processing Stripe webhook");

        // Handle the event
        await handleWebhookEvent(prisma, event);

        return reply.status(200).send({ received: true });
      } catch (err) {
        fastify.log.error({ err }, "Stripe webhook error");
        return reply.status(400).send({
          error: err instanceof Error ? err.message : "Webhook error",
        });
      }
    }
  );

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
