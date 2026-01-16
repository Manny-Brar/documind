/**
 * Text extraction utilities for different file types
 *
 * Supports: PDF, DOCX, PPTX, XLSX, TXT, MD
 *
 * Optional dependencies (install as needed):
 *   pnpm add pdf-parse mammoth xlsx officeparser
 */

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
  pages?: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export type FileType = "pdf" | "docx" | "pptx" | "xlsx" | "txt" | "md";

/**
 * Extract text from a file buffer based on file type
 */
export async function extractText(
  buffer: Buffer,
  fileType: FileType
): Promise<ExtractionResult> {
  switch (fileType) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    case "pptx":
      return extractPptx(buffer);
    case "xlsx":
      return extractXlsx(buffer);
    case "txt":
    case "md":
      return extractPlainText(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text from plain text files (TXT, MD)
 */
async function extractPlainText(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString("utf-8");
  return {
    text,
    pageCount: 1,
    metadata: {
      encoding: "utf-8",
    },
  };
}

/**
 * Try to dynamically import a package, returning null if not available
 */
async function tryImport<T>(moduleName: string): Promise<T | null> {
  try {
    return await import(moduleName) as T;
  } catch {
    return null;
  }
}

/**
 * Extract text from PDF files
 *
 * Note: Requires pdf-parse package to be installed:
 *   pnpm add pdf-parse
 */
async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const pdfParse = await tryImport<{ default: (buffer: Buffer) => Promise<{ text: string; numpages: number; info: unknown; version: string }> }>("pdf-parse");

    if (!pdfParse) {
      console.warn("pdf-parse not installed - using placeholder extraction");
      return {
        text: "[PDF extraction requires pdf-parse package]",
        pageCount: 1,
        metadata: { extractionSkipped: true },
      };
    }

    const data = await pdfParse.default(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
      metadata: {
        info: data.info,
        version: data.version,
      },
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from DOCX files
 *
 * Note: Requires mammoth package to be installed:
 *   pnpm add mammoth
 */
async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const mammoth = await tryImport<{ extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }> }>("mammoth");

    if (!mammoth) {
      console.warn("mammoth not installed - using placeholder extraction");
      return {
        text: "[DOCX extraction requires mammoth package]",
        pageCount: 1,
        metadata: { extractionSkipped: true },
      };
    }

    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      pageCount: 1, // DOCX doesn't have page concept before rendering
      metadata: {
        messages: result.messages,
      },
    };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(`Failed to extract DOCX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from PPTX files
 *
 * Note: Requires officeparser package to be installed:
 *   pnpm add officeparser
 */
async function extractPptx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const officeparser = await tryImport<{ parseOfficeAsync: (buffer: Buffer) => Promise<string> }>("officeparser");

    if (officeparser) {
      const text = await officeparser.parseOfficeAsync(buffer);
      return {
        text,
        pageCount: 1,
        metadata: { format: "pptx" },
      };
    }

    console.warn("officeparser not installed - using placeholder extraction");
    return {
      text: "[PPTX extraction requires officeparser package]",
      pageCount: 1,
      metadata: { extractionSkipped: true },
    };
  } catch (error) {
    console.error("PPTX extraction error:", error);
    throw new Error(`Failed to extract PPTX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from XLSX files
 *
 * Note: Requires xlsx package to be installed:
 *   pnpm add xlsx
 */
async function extractXlsx(buffer: Buffer): Promise<ExtractionResult> {
  try {
    interface XLSXModule {
      read: (buffer: Buffer, options: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
      utils: { sheet_to_txt: (sheet: unknown) => string };
    }

    const XLSX = await tryImport<XLSXModule>("xlsx");

    if (!XLSX) {
      console.warn("xlsx not installed - using placeholder extraction");
      return {
        text: "[XLSX extraction requires xlsx package]",
        pageCount: 1,
        metadata: { extractionSkipped: true },
      };
    }

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const texts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const text = XLSX.utils.sheet_to_txt(sheet);
      texts.push(`--- Sheet: ${sheetName} ---\n${text}`);
    }

    return {
      text: texts.join("\n\n"),
      pageCount: workbook.SheetNames.length,
      metadata: {
        sheetNames: workbook.SheetNames,
      },
    };
  } catch (error) {
    console.error("XLSX extraction error:", error);
    throw new Error(`Failed to extract XLSX: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Estimate token count for a text string
 * Uses a simple heuristic (4 characters per token on average)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
