import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, CardContent, CardHeader, CardTitle, StatsCard, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";
import { DocumentViewer } from "../../components/document-viewer";

// Document type for viewer
interface ViewableDocument {
  id: string;
  filename: string;
  fileType: string;
  mimeType: string;
}

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  md: "text/markdown",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

// File type icons
const FILE_ICONS: Record<string, { bg: string; color: string; label: string }> = {
  pdf: { bg: "bg-red-100", color: "text-red-600", label: "PDF" },
  docx: { bg: "bg-blue-100", color: "text-blue-600", label: "DOC" },
  pptx: { bg: "bg-orange-100", color: "text-orange-600", label: "PPT" },
  xlsx: { bg: "bg-green-100", color: "text-green-600", label: "XLS" },
  txt: { bg: "bg-gray-100", color: "text-gray-600", label: "TXT" },
  md: { bg: "bg-purple-100", color: "text-purple-600", label: "MD" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString();
}

function DashboardPage() {
  const org = useOrg();
  const [viewingDocument, setViewingDocument] = useState<ViewableDocument | null>(null);

  // Fetch document stats
  const { data: docStats, isLoading: statsLoading } = trpc.documents.getStats.useQuery({
    orgId: org.id,
  });

  // Fetch recent documents
  const { data: recentDocs, isLoading: docsLoading } = trpc.documents.list.useQuery({
    orgId: org.id,
    limit: 5,
  });

  // Fetch search stats
  const { data: searchStats } = trpc.search.getStats.useQuery({
    orgId: org.id,
    days: 30,
  });

  const documents = recentDocs?.documents || [];
  const hasDocuments = documents.length > 0;
  const isLoading = statsLoading || docsLoading;

  // Calculate storage percentage
  const storagePercentage = docStats
    ? Math.round((docStats.storageUsedBytes / docStats.storageQuotaBytes) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <section>
        <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Quick Actions
        </h2>
        <Card variant="yellow" className="p-6">
          <div className="flex flex-wrap gap-4">
            <Link to="/documents">
              <Button size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Upload Document
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="secondary" size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Documents
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Stats Overview */}
      <section>
        <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Documents"
            value={docStats?.total ?? 0}
            trend={docStats?.indexed ? { value: docStats.indexed, label: "indexed" } : undefined}
            variant="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatsCard
            label="Storage Used"
            value={formatFileSize(docStats?.storageUsedBytes ?? 0)}
            trend={{ value: storagePercentage, label: `of ${formatFileSize(docStats?.storageQuotaBytes ?? 0)}` }}
            progress={{ value: storagePercentage }}
            variant="pink"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            }
          />
          <StatsCard
            label="Searches"
            value={searchStats?.totalSearches ?? 0}
            trend={searchStats?.questionsAsked ? { value: searchStats.questionsAsked, label: "questions asked" } : undefined}
            variant="mint"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Recent Documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">
            Recent Documents
          </h2>
          <Link to="/documents" className="text-sm font-bold text-primary hover:underline">
            View all →
          </Link>
        </div>

        {isLoading && (
          <Card className="p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin border-4 border-black border-t-transparent mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        )}

        {!isLoading && hasDocuments && (
          <Card>
            <div className="divide-y-2 divide-black">
              {documents.map((doc) => {
                const fileIcon = FILE_ICONS[doc.fileType] ?? { bg: "bg-gray-100", color: "text-gray-600", label: "FILE" };
                return (
                  <button
                    key={doc.id}
                    className="w-full flex items-center gap-4 p-4 hover:bg-surface-yellow transition-colors cursor-pointer group text-left"
                    onClick={() => setViewingDocument({
                      id: doc.id,
                      filename: doc.filename,
                      fileType: doc.fileType,
                      mimeType: MIME_TYPES[doc.fileType] ?? "application/octet-stream",
                    })}
                  >
                    <div className={`w-10 h-10 flex items-center justify-center border-2 border-black ${fileIcon.bg} shadow-neo-sm`}>
                      <span className={`text-xs font-bold ${fileIcon.color}`}>{fileIcon.label}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{doc.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(Number(doc.fileSizeBytes))} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        doc.indexStatus === "indexed"
                          ? "blue"
                          : doc.indexStatus === "failed"
                          ? "pink"
                          : "yellow"
                      }
                    >
                      {doc.indexStatus}
                    </Badge>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon-sm" variant="ghost">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                      <Button size="icon-sm" variant="ghost">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {!isLoading && !hasDocuments && (
          <Card variant="lavender" className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-heading text-xl uppercase mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first document to get started with AI-powered search.
              </p>
              <Link to="/documents">
                <Button>Upload Document</Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* Getting Started - Only show if no documents */}
      {!hasDocuments && !isLoading && (
        <section>
          <Card variant="lavender">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <Badge variant="yellow">1</Badge>
                <div>
                  <p className="font-bold">Upload your first document</p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to upload PDF, DOCX, PPTX, and more
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Badge variant="blue">2</Badge>
                <div>
                  <p className="font-bold">Search with natural language</p>
                  <p className="text-sm text-muted-foreground">
                    Ask questions like "What were Q4 revenue numbers?"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Badge variant="pink">3</Badge>
                <div>
                  <p className="font-bold">Get AI-powered answers</p>
                  <p className="text-sm text-muted-foreground">
                    Receive accurate answers grounded in your documents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          filename={viewingDocument.filename}
          fileType={viewingDocument.fileType}
          mimeType={viewingDocument.mimeType}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
