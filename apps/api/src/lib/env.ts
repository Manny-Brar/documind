import { validateStorageEnv } from "./storage.js";

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  PORT: "3001",
  NODE_ENV: "development",
  CORS_ORIGIN: "http://localhost:5173",
  GCS_BUCKET: "documind-documents",
} as const;

/**
 * Environment validation result
 */
interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
    databaseUrl: string;
    authUrl: string;
    gcsBucket: string;
    hasGcsCredentials: boolean;
    hasGoogleOAuth: boolean;
  };
}

/**
 * Validate all required environment variables
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check and apply optional defaults
  for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      warnings.push(`${key} not set, using default: ${defaultValue}`);
    }
  }

  // Validate storage configuration
  const storageValidation = validateStorageEnv();
  errors.push(...storageValidation.errors);
  warnings.push(...storageValidation.warnings);

  // Check for Google OAuth (optional but recommended)
  const hasGoogleOAuth = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  if (!hasGoogleOAuth) {
    warnings.push("Google OAuth not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
  }

  // Check for Stripe (optional for billing)
  const hasStripe = !!(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY
  );
  if (!hasStripe) {
    warnings.push("Stripe not configured (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)");
  }

  // Build config object
  const config = {
    port: parseInt(process.env.PORT || "3001", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    databaseUrl: process.env.DATABASE_URL || "",
    authUrl: process.env.BETTER_AUTH_URL || "",
    gcsBucket: process.env.GCS_BUCKET || "documind-documents",
    hasGcsCredentials: !!(process.env.GCS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    hasGoogleOAuth,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Print environment validation results
 */
export function printEnvValidation(result: EnvValidationResult): void {
  console.log("\n=== Environment Validation ===\n");

  if (result.errors.length > 0) {
    console.log("ERRORS:");
    result.errors.forEach((err) => console.log(`  [x] ${err}`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log("WARNINGS:");
    result.warnings.forEach((warn) => console.log(`  [!] ${warn}`));
    console.log();
  }

  console.log("CONFIGURATION:");
  console.log(`  Port: ${result.config.port}`);
  console.log(`  Environment: ${result.config.nodeEnv}`);
  console.log(`  CORS Origin: ${result.config.corsOrigin}`);
  console.log(`  Auth URL: ${result.config.authUrl}`);
  console.log(`  GCS Bucket: ${result.config.gcsBucket}`);
  console.log(`  GCS Configured: ${result.config.hasGcsCredentials ? "Yes" : "No (fallback mode)"}`);
  console.log(`  Google OAuth: ${result.config.hasGoogleOAuth ? "Yes" : "No"}`);
  console.log();

  if (result.isValid) {
    console.log("Status: READY");
  } else {
    console.log("Status: CONFIGURATION ERRORS - Please fix the errors above");
  }

  console.log("\n==============================\n");
}

/**
 * Validate environment and exit if invalid (for production)
 */
export function validateEnvOrExit(): EnvValidationResult {
  const result = validateEnv();
  printEnvValidation(result);

  if (!result.isValid && process.env.NODE_ENV === "production") {
    console.error("Environment validation failed. Exiting...");
    process.exit(1);
  }

  return result;
}
