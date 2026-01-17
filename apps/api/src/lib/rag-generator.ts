/**
 * RAG (Retrieval-Augmented Generation) Answer Generator
 *
 * Takes search results from vector search and generates
 * AI-powered answers with source citations.
 *
 * Supports:
 * - Google Vertex AI (Gemini)
 * - OpenAI (GPT-4o)
 * - Mock responses for development
 */

export interface RagConfig {
  provider: "vertex" | "openai" | "mock";
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SourceChunk {
  documentId: string;
  filename: string;
  content: string;
  score: number;
  pageNumber?: number;
  chunkIndex?: number;
}

export interface RagAnswer {
  answer: string;
  sources: Array<{
    documentId: string;
    filename: string;
    pageNumber?: number;
    relevance: number;
  }>;
  tokensUsed: number;
  latencyMs: number;
  model: string;
}

// Default configuration
const DEFAULT_CONFIG: RagConfig = {
  provider: "mock",
  maxTokens: 1024,
  temperature: 0.3,
};

// Environment-based configuration
function getConfig(): RagConfig {
  const vertexProject = process.env.GCP_PROJECT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (vertexProject && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      provider: "vertex",
      model: "gemini-1.5-flash",
      maxTokens: 1024,
      temperature: 0.3,
    };
  }

  if (openaiKey) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 1024,
      temperature: 0.3,
    };
  }

  console.warn("[RAG] No LLM provider configured - using mock responses");
  return DEFAULT_CONFIG;
}

/**
 * Generate an answer from search results
 */
export async function generateAnswer(
  question: string,
  chunks: SourceChunk[],
  config?: RagConfig,
  entityContext?: string
): Promise<RagAnswer> {
  const cfg = config ?? getConfig();
  const startTime = Date.now();

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find any relevant documents to answer your question. Please try a different search query or upload relevant documents.",
      sources: [],
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      model: cfg.model ?? "none",
    };
  }

  // Assemble context from chunks, optionally with entity context
  let context = assembleContext(chunks);
  if (entityContext) {
    context = `${entityContext}\n\n---\n\n${context}`;
  }

  // Generate answer based on provider
  switch (cfg.provider) {
    case "vertex":
      return generateVertexAnswer(question, context, chunks, cfg, startTime);
    case "openai":
      return generateOpenAIAnswer(question, context, chunks, cfg, startTime);
    case "mock":
    default:
      return generateMockAnswer(question, context, chunks, cfg, startTime);
  }
}

/**
 * Assemble context from source chunks
 */
function assembleContext(chunks: SourceChunk[]): string {
  const contextParts: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const header = chunk.pageNumber
      ? `[Source ${i + 1}: ${chunk.filename}, Page ${chunk.pageNumber}]`
      : `[Source ${i + 1}: ${chunk.filename}]`;

    contextParts.push(`${header}\n${chunk.content}`);
  }

  return contextParts.join("\n\n---\n\n");
}

/**
 * Build the RAG prompt
 */
function buildPrompt(question: string, context: string): string {
  return `You are a helpful assistant that answers questions based on the provided document context.

## Instructions:
- Answer the question using ONLY the information in the provided context
- If the context doesn't contain enough information to answer, say so
- Be concise and direct in your answer
- Reference specific sources when relevant (e.g., "According to Source 1...")
- Do not make up information not present in the context
- If Knowledge Graph context is provided, use entity and relationship information to provide richer, more connected answers
- When mentioning entities, be precise about their relationships to other entities

## Context:
${context}

## Question:
${question}

## Answer:`;
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
 * Generate answer using Google Vertex AI (Gemini)
 */
async function generateVertexAnswer(
  question: string,
  context: string,
  chunks: SourceChunk[],
  config: RagConfig,
  startTime: number
): Promise<RagAnswer> {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION ?? "us-central1";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID not configured");
  }

  try {
    // Try to get access token from google-auth-library if available
    let accessToken: string | null = null;

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

    if (!accessToken) {
      console.warn("[RAG] No Vertex AI auth token available, using mock");
      return generateMockAnswer(question, context, chunks, config, startTime);
    }

    const model = config.model ?? "gemini-1.5-flash";
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const prompt = buildPrompt(question, context);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens ?? 1024,
          temperature: config.temperature ?? 0.3,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error: ${error}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to generate answer.";
    const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

    return {
      answer: answer.trim(),
      sources: extractSources(chunks),
      tokensUsed,
      latencyMs: Date.now() - startTime,
      model,
    };
  } catch (error) {
    console.error("[RAG] Vertex AI error:", error);
    // Fall back to mock on error
    return generateMockAnswer(question, context, chunks, config, startTime);
  }
}

/**
 * Generate answer using OpenAI
 */
async function generateOpenAIAnswer(
  question: string,
  context: string,
  chunks: SourceChunk[],
  config: RagConfig,
  startTime: number
): Promise<RagAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const model = config.model ?? "gpt-4o-mini";
    const prompt = buildPrompt(question, context);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers questions based on document context. Be concise and cite sources.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const answer = data.choices?.[0]?.message?.content ?? "Unable to generate answer.";
    const tokensUsed = data.usage?.total_tokens ?? 0;

    return {
      answer: answer.trim(),
      sources: extractSources(chunks),
      tokensUsed,
      latencyMs: Date.now() - startTime,
      model,
    };
  } catch (error) {
    console.error("[RAG] OpenAI error:", error);
    // Fall back to mock on error
    return generateMockAnswer(question, context, chunks, config, startTime);
  }
}

/**
 * Generate mock answer for development
 */
async function generateMockAnswer(
  question: string,
  context: string,
  chunks: SourceChunk[],
  config: RagConfig,
  startTime: number
): Promise<RagAnswer> {
  // Simulate some latency
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Generate a contextual mock answer
  const sourceList = chunks
    .slice(0, 3)
    .map((c, i) => `Source ${i + 1}: ${c.filename}`)
    .join(", ");

  const answer = `Based on the provided documents (${sourceList}), here is what I found regarding your question about "${question}":

The documents contain relevant information that addresses your query. According to Source 1, the key points are covered in the uploaded materials. Please note this is a mock response - configure an LLM provider (Vertex AI or OpenAI) for actual AI-generated answers.

Key findings:
- Information from ${chunks[0]?.filename ?? "document"} is most relevant
- Additional context found in ${chunks.length} document(s)
- Similarity scores range from ${Math.round((chunks[chunks.length - 1]?.score ?? 0) * 100)}% to ${Math.round((chunks[0]?.score ?? 0) * 100)}%`;

  return {
    answer,
    sources: extractSources(chunks),
    tokensUsed: estimateTokens(context + answer),
    latencyMs: Date.now() - startTime,
    model: "mock",
  };
}

/**
 * Extract source citations from chunks
 */
function extractSources(chunks: SourceChunk[]): RagAnswer["sources"] {
  // Deduplicate by document and take top sources
  const seen = new Set<string>();
  const sources: RagAnswer["sources"] = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.documentId)) continue;
    seen.add(chunk.documentId);

    sources.push({
      documentId: chunk.documentId,
      filename: chunk.filename,
      pageNumber: chunk.pageNumber,
      relevance: Math.round(chunk.score * 100),
    });

    if (sources.length >= 5) break;
  }

  return sources;
}

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if RAG is configured
 */
export function isRagConfigured(): boolean {
  const config = getConfig();
  return config.provider !== "mock";
}
