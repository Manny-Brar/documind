/**
 * Text chunking utilities for document indexing
 *
 * Splits documents into overlapping chunks optimized for semantic search.
 */

export interface ChunkOptions {
  /** Target size for each chunk in characters */
  chunkSize?: number;
  /** Overlap between adjacent chunks in characters */
  chunkOverlap?: number;
  /** Separator to use for splitting (regex or string) */
  separators?: string[];
}

export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// Default separators in order of priority (paragraph -> sentence -> word)
const DEFAULT_SEPARATORS = [
  "\n\n",   // Double newline (paragraphs)
  "\n",     // Single newline
  ". ",     // Sentences
  "? ",     // Questions
  "! ",     // Exclamations
  "; ",     // Semicolons
  ", ",     // Commas
  " ",      // Words
];

/**
 * Split text into overlapping chunks for embedding
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators = DEFAULT_SEPARATORS,
  } = options;

  // Clean and normalize text
  const cleanedText = normalizeText(text);

  if (!cleanedText || cleanedText.length === 0) {
    return [];
  }

  // If text is smaller than chunk size, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [{
      content: cleanedText,
      index: 0,
      tokenCount: estimateTokens(cleanedText),
      startOffset: 0,
      endOffset: cleanedText.length,
    }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < cleanedText.length) {
    // Determine end position
    let end = Math.min(start + chunkSize, cleanedText.length);

    // If not at the end, try to find a good break point
    if (end < cleanedText.length) {
      const breakPoint = findBreakPoint(cleanedText, start, end, separators);
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    // Extract chunk content
    const content = cleanedText.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        index: chunkIndex,
        tokenCount: estimateTokens(content),
        startOffset: start,
        endOffset: end,
      });
      chunkIndex++;
    }

    // Move start position with overlap
    start = end - chunkOverlap;

    // Ensure we're making progress
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && start <= lastChunk.startOffset) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Split text into chunks by pages (for PDFs)
 */
export function chunkByPages(
  pages: Array<{ pageNumber: number; text: string }>,
  options: ChunkOptions = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  let globalIndex = 0;
  let globalOffset = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, options);

    for (const chunk of pageChunks) {
      chunks.push({
        ...chunk,
        index: globalIndex,
        startOffset: globalOffset + chunk.startOffset,
        endOffset: globalOffset + chunk.endOffset,
        metadata: {
          pageNumber: page.pageNumber,
        },
      });
      globalIndex++;
    }

    globalOffset += page.text.length;
  }

  return chunks;
}

/**
 * Find the best break point in text within a range
 */
function findBreakPoint(
  text: string,
  start: number,
  end: number,
  separators: string[]
): number {
  // Look for break points starting from the end, working backwards
  const searchStart = Math.max(start, end - 200); // Don't go too far back

  for (const sep of separators) {
    // Search backwards from end
    for (let i = end - 1; i >= searchStart; i--) {
      if (text.slice(i, i + sep.length) === sep) {
        // Return position after the separator
        return i + sep.length;
      }
    }
  }

  // No good break point found, return original end
  return end;
}

/**
 * Normalize text for chunking
 */
function normalizeText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove excessive whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}

/**
 * Estimate token count for a text string
 * Uses OpenAI's approximate ratio: 4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Merge small chunks that are below minimum size
 */
export function mergeSmallChunks(
  chunks: Chunk[],
  minSize: number = 100
): Chunk[] {
  if (chunks.length === 0) return [];

  const result: Chunk[] = [];
  let currentChunk: Chunk = chunks[0]!;

  for (let i = 1; i < chunks.length; i++) {
    const nextChunk = chunks[i]!;

    // If current chunk is small, merge with next
    if (currentChunk.content.length < minSize) {
      currentChunk = {
        content: currentChunk.content + " " + nextChunk.content,
        index: currentChunk.index,
        tokenCount: estimateTokens(currentChunk.content + " " + nextChunk.content),
        startOffset: currentChunk.startOffset,
        endOffset: nextChunk.endOffset,
        metadata: { ...currentChunk.metadata, ...nextChunk.metadata },
      };
    } else {
      result.push(currentChunk);
      currentChunk = nextChunk;
    }
  }

  // Don't forget the last chunk
  result.push(currentChunk);

  // Re-index
  return result.map((chunk, i) => ({ ...chunk, index: i }));
}
