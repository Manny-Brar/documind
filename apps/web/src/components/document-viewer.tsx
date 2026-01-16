import { useState, useEffect } from "react";
import { Button, Card, Badge } from "@documind/ui";
import { trpc } from "../lib/trpc";

interface DocumentViewerProps {
  documentId: string;
  filename: string;
  fileType: string;
  mimeType: string;
  onClose: () => void;
}

/**
 * File type categories for rendering
 */
type FileCategory = "pdf" | "image" | "text" | "office" | "unknown";

const FILE_CATEGORIES: Record<string, FileCategory> = {
  pdf: "pdf",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  txt: "text",
  md: "text",
  markdown: "text",
  json: "text",
  xml: "text",
  csv: "text",
  docx: "office",
  pptx: "office",
  xlsx: "office",
};

function getFileCategory(fileType: string): FileCategory {
  return FILE_CATEGORIES[fileType.toLowerCase()] ?? "unknown";
}

/**
 * Document Viewer Modal
 * Supports PDF, images, and text files with inline preview
 */
export function DocumentViewer({
  documentId,
  filename,
  fileType,
  mimeType,
  onClose,
}: DocumentViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get download URL for the document
  const { data: downloadData, isLoading: loadingUrl } = trpc.documents.getDownloadUrl.useQuery({
    documentId,
    disposition: "inline",
  });

  const fileCategory = getFileCategory(fileType);

  // Load text content for text files
  useEffect(() => {
    if (fileCategory === "text" && downloadData?.downloadUrl) {
      setLoadingText(true);
      fetch(downloadData.downloadUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load file");
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoadingText(false);
        });
    }
  }, [fileCategory, downloadData?.downloadUrl]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isLoading = loadingUrl || loadingText;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-black bg-surface-yellow">
            <div className="flex items-center gap-4 min-w-0">
              <FileTypeIcon fileType={fileType} />
              <div className="min-w-0">
                <h2 className="font-bold truncate">{filename}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{fileType.toUpperCase()}</Badge>
                  <span className="truncate">{mimeType}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {downloadData?.downloadUrl && (
                <a
                  href={downloadData.downloadUrl}
                  download={filename}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-100">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block h-12 w-12 animate-spin border-4 border-black border-t-transparent mb-4" />
                  <p className="font-heading text-lg uppercase tracking-wider">Loading document...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-8">
                <Card variant="pink" className="p-6 text-center max-w-md">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white">
                    <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="font-heading text-xl uppercase mb-2">Failed to Load</h3>
                  <p className="text-muted-foreground">{error}</p>
                </Card>
              </div>
            ) : (
              <DocumentContent
                category={fileCategory}
                url={downloadData?.downloadUrl || ""}
                textContent={textContent}
                filename={filename}
                mimeType={mimeType}
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/**
 * File type icon component
 */
function FileTypeIcon({ fileType }: { fileType: string }) {
  const FILE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
    pdf: { bg: "bg-red-100", color: "text-red-600", label: "PDF" },
    docx: { bg: "bg-blue-100", color: "text-blue-600", label: "DOC" },
    pptx: { bg: "bg-orange-100", color: "text-orange-600", label: "PPT" },
    xlsx: { bg: "bg-green-100", color: "text-green-600", label: "XLS" },
    txt: { bg: "bg-gray-100", color: "text-gray-600", label: "TXT" },
    md: { bg: "bg-purple-100", color: "text-purple-600", label: "MD" },
    jpg: { bg: "bg-pink-100", color: "text-pink-600", label: "IMG" },
    jpeg: { bg: "bg-pink-100", color: "text-pink-600", label: "IMG" },
    png: { bg: "bg-pink-100", color: "text-pink-600", label: "IMG" },
    gif: { bg: "bg-pink-100", color: "text-pink-600", label: "GIF" },
  };

  const icon = FILE_ICONS[fileType.toLowerCase()] ?? { bg: "bg-gray-100", color: "text-gray-600", label: "FILE" };

  return (
    <div className={`w-10 h-10 flex items-center justify-center border-2 border-black ${icon.bg} shadow-neo-sm shrink-0`}>
      <span className={`text-xs font-bold ${icon.color}`}>{icon.label}</span>
    </div>
  );
}

/**
 * Document content renderer based on file type
 */
function DocumentContent({
  category,
  url,
  textContent,
  filename,
}: {
  category: FileCategory;
  url: string;
  textContent: string | null;
  filename: string;
  mimeType: string;
}) {
  switch (category) {
    case "pdf":
      return (
        <iframe
          src={url}
          className="w-full h-full"
          title={filename}
          style={{ minHeight: "100%" }}
        />
      );

    case "image":
      return (
        <div className="flex items-center justify-center h-full p-8">
          <img
            src={url}
            alt={filename}
            className="max-w-full max-h-full object-contain border-2 border-black shadow-neo"
          />
        </div>
      );

    case "text":
      return (
        <div className="h-full p-4">
          <Card className="h-full overflow-auto p-6">
            <pre className="font-mono text-sm whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          </Card>
        </div>
      );

    case "office":
      // Office files can't be rendered directly, show download prompt
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Card variant="blue" className="p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase mb-2">Office Document</h3>
            <p className="text-muted-foreground mb-4">
              This file type cannot be previewed in the browser. Download it to view in Microsoft Office or compatible application.
            </p>
            <a href={url} download={filename} target="_blank" rel="noopener noreferrer">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {filename}
              </Button>
            </a>
          </Card>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Card variant="yellow" className="p-8 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase mb-2">Preview Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              This file type cannot be previewed. Download it to open in a compatible application.
            </p>
            <a href={url} download={filename} target="_blank" rel="noopener noreferrer">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {filename}
              </Button>
            </a>
          </Card>
        </div>
      );
  }
}
