/**
 * Embedding generation service
 *
 * Supports:
 * - Google Vertex AI text-embedding-004
 * - OpenAI text-embedding-3-small (fallback)
 * - Mock embeddings for development
 *
 * Optional dependencies:
 *   pnpm add google-auth-library (for Vertex AI)
 */

export interface EmbeddingConfig {
  provider: "vertex" | "openai" | "mock";
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
    tokenCount: number;
  }>;
  totalTokens: number;
}

// Default configuration
const DEFAULT_CONFIG: EmbeddingConfig = {
  provider: "mock",
  dimensions: 768, // Match Vertex AI text-embedding-004
};

// Environment-based configuration
function getConfig(): EmbeddingConfig {
  const vertexProject = process.env.GCP_PROJECT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (vertexProject && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      provider: "vertex",
      model: "text-embedding-004",
      dimensions: 768,
    };
  }

  if (openaiKey) {
    return {
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
    };
  }

  console.warn("No embedding provider configured - using mock embeddings");
  return DEFAULT_CONFIG;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  config?: EmbeddingConfig
): Promise<EmbeddingResult> {
  const cfg = config ?? getConfig();

  switch (cfg.provider) {
    case "vertex":
      return generateVertexEmbedding(text, cfg);
    case "openai":
      return generateOpenAIEmbedding(text, cfg);
    case "mock":
    default:
      return generateMockEmbedding(text, cfg);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
  config?: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const cfg = config ?? getConfig();

  switch (cfg.provider) {
    case "vertex":
      return generateVertexBatchEmbeddings(texts, cfg);
    case "openai":
      return generateOpenAIBatchEmbeddings(texts, cfg);
    case "mock":
    default:
      return generateMockBatchEmbeddings(texts, cfg);
  }
}

/**
 * Generate embedding using Google Vertex AI
 */
async function generateVertexEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const result = await generateVertexBatchEmbeddings([text], config);
  const first = result.embeddings[0];
  if (!first) {
    throw new Error("No embedding returned from Vertex AI");
  }
  return {
    embedding: first.embedding,
    tokenCount: first.tokenCount,
  };
}

/**
 * Try to dynamically import a module
 */
async function tryImport<T>(moduleName: string): Promise<T | null> {
  try {
    return await import(moduleName) as T;
  } catch {
    return null;
  }
}

/**
 * Generate batch embeddings using Google Vertex AI
 *
 * Note: Requires google-auth-library to be installed for ADC:
 *   pnpm add google-auth-library
 */
async function generateVertexBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "us-central1";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID not configured");
  }

  try {
    // Use the Vertex AI API directly
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${config.model}:predict`;

    // Try to get access token from google-auth-library if available
    let accessToken: string | null = null;

    try {
      // Dynamic import to handle when package isn't installed
      interface GoogleAuthModule {
        GoogleAuth: new (options: { scopes: string[] }) => {
          getClient: () => Promise<{
            getAccessToken: () => Promise<{ token?: string | null }>;
          }>;
        };
      }

      const googleAuth = await tryImport<GoogleAuthModule>("google-auth-library");
      if (googleAuth) {
        const auth = new googleAuth.GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        accessToken = tokenResponse.token ?? null;
      }
    } catch {
      console.warn("google-auth-library not available, falling back to mock embeddings");
    }

    if (!accessToken) {
      // Fall back to mock embeddings if no auth available
      console.warn("No Vertex AI auth token available, using mock embeddings");
      return generateMockBatchEmbeddings(texts, config);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        instances: texts.map((text) => ({ content: text })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error: ${error}`);
    }

    const data = (await response.json()) as {
      predictions: Array<{
        embeddings: { values: number[] };
        statistics?: { token_count: number };
      }>;
    };

    let totalTokens = 0;
    const embeddings = data.predictions.map((pred, index) => {
      const text = texts[index] ?? "";
      const tokenCount = pred.statistics?.token_count ?? estimateTokens(text);
      totalTokens += tokenCount;
      return {
        index,
        embedding: pred.embeddings.values,
        tokenCount,
      };
    });

    return { embeddings, totalTokens };
  } catch (error) {
    console.error("Vertex AI embedding error:", error);
    throw error;
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const result = await generateOpenAIBatchEmbeddings([text], config);
  const first = result.embeddings[0];
  if (!first) {
    throw new Error("No embedding returned from OpenAI");
  }
  return {
    embedding: first.embedding,
    tokenCount: first.tokenCount,
  };
}

/**
 * Generate batch embeddings using OpenAI
 */
async function generateOpenAIBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? "text-embedding-3-small",
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { total_tokens: number };
    };

    const embeddings = data.data.map((item) => ({
      index: item.index,
      embedding: item.embedding,
      tokenCount: Math.ceil((texts[item.index] ?? "").length / 4),
    }));

    return {
      embeddings: embeddings.sort((a, b) => a.index - b.index),
      totalTokens: data.usage.total_tokens,
    };
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw error;
  }
}

/**
 * Generate mock embedding for development/testing
 */
async function generateMockEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const dimensions = config.dimensions ?? 768;
  const tokenCount = estimateTokens(text);

  // Generate deterministic pseudo-random embedding based on text hash
  const embedding = generateDeterministicEmbedding(text, dimensions);

  return { embedding, tokenCount };
}

/**
 * Generate mock batch embeddings
 */
async function generateMockBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<BatchEmbeddingResult> {
  const dimensions = config.dimensions ?? 768;
  let totalTokens = 0;

  const embeddings = texts.map((text, index) => {
    const tokenCount = estimateTokens(text);
    totalTokens += tokenCount;
    return {
      index,
      embedding: generateDeterministicEmbedding(text, dimensions),
      tokenCount,
    };
  });

  return { embeddings, totalTokens };
}

/**
 * Generate a deterministic pseudo-random embedding based on text content
 * This creates consistent embeddings for the same text (useful for testing)
 */
function generateDeterministicEmbedding(text: string, dimensions: number): number[] {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Seed a pseudo-random number generator
  const seed = Math.abs(hash);
  const embedding: number[] = [];

  // Generate embedding values using a simple PRNG
  let state = seed;
  for (let i = 0; i < dimensions; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    // Normalize to [-1, 1]
    const value = (state / 0x7fffffff) * 2 - 1;
    embedding.push(value);
  }

  // Normalize the vector to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map((v) => v / magnitude);
}

/**
 * Estimate token count for a text string
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have same dimensions");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    magnitudeA += aVal * aVal;
    magnitudeB += bVal * bVal;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Check if embedding service is configured
 */
export function isEmbeddingConfigured(): boolean {
  const config = getConfig();
  return config.provider !== "mock";
}
