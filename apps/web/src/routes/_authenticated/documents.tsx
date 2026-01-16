import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
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

function formatFileSize(bytes: number | bigint): string {
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

function DocumentsPage() {
  const org = useOrg();
  const utils = trpc.useUtils();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  // Fetch documents
  const { data, isLoading, error } = trpc.documents.list.useQuery({
    orgId: org.id,
    limit: 50,
  });

  // Get upload URL mutation
  const getUploadUrl = trpc.documents.getUploadUrl.useMutation();

  // Confirm upload mutation
  const confirmUpload = trpc.documents.confirmUpload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
    },
  });

  // Delete mutation
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
    },
  });

  // Handle file upload
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploadingFiles(fileArray);

    for (const file of fileArray) {
      try {
        // Get signed upload URL
        const uploadData = await getUploadUrl.mutateAsync({
          orgId: org.id,
          filename: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
        });

        // Upload file to signed URL (GCS) or fallback endpoint
        if (uploadData.useSignedUrl) {
          // Direct upload to GCS using signed URL
          const uploadResponse = await fetch(uploadData.uploadUrl, {
            method: "PUT",
            headers: uploadData.headers,
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
        }
        // Note: If useSignedUrl is false, we're in fallback mode
        // The file would need to be uploaded to /api/upload/:id endpoint
        // For now, we'll just confirm the upload record exists

        // Confirm upload completed
        await confirmUpload.mutateAsync({
          documentId: uploadData.documentId,
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploadingFiles([]);
    setShowUploadModal(false);
  }, [org.id, getUploadUrl, confirmUpload]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const documents = data?.documents || [];
  const hasDocuments = documents.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl uppercase tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your document library</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </Button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xl mx-auto z-50">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl uppercase">Upload Documents</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">Drag and drop files here</p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <label className="inline-block cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.xlsx,.txt,.md"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  />
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all border-2 border-black shadow-neo hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] px-6 py-2 bg-white text-black">
                    Browse Files
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: PDF, DOCX, PPTX, XLSX, TXT, MD (max 100MB)
                </p>
              </div>

              {/* Uploading files */}
              {uploadingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12 text-center">
          <div className="inline-block h-12 w-12 animate-spin border-4 border-black border-t-transparent mb-4" />
          <p className="font-heading text-lg uppercase tracking-wider">Loading documents...</p>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card variant="pink" className="p-6">
          <p className="text-destructive font-medium">Failed to load documents</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && !hasDocuments && (
        <Card
          variant="yellow"
          className={`p-12 text-center transition-colors ${isDragging ? "ring-2 ring-primary" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border-2 border-black bg-white shadow-neo">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-heading text-2xl uppercase tracking-tight mb-2">No Documents Yet</h2>
            <p className="text-muted-foreground mb-6">
              Upload your first document to get started with AI-powered search
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => setShowUploadModal(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Files
              </Button>
              <Button variant="secondary" size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Google Drive
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Document List */}
      {!isLoading && !error && hasDocuments && (
        <Card>
          <div className="divide-y-2 divide-black">
            {documents.map((doc) => {
              const fileIcon = FILE_ICONS[doc.fileType] ?? { bg: "bg-gray-100", color: "text-gray-600", label: "FILE" };
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 hover:bg-surface-yellow transition-colors group"
                >
                  {/* File Icon */}
                  <div className={`w-12 h-12 flex items-center justify-center border-2 border-black ${fileIcon.bg} shadow-neo-sm`}>
                    <span className={`text-xs font-bold ${fileIcon.color}`}>{fileIcon.label}</span>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{doc.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(doc.fileSizeBytes)} · {formatDate(doc.createdAt)}
                      {doc.uploadedBy && ` · ${doc.uploadedBy.name}`}
                    </p>
                  </div>

                  {/* Index Status */}
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

                  {/* Actions */}
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
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this document?")) {
                          deleteDoc.mutate({ id: doc.id });
                        }
                      }}
                    >
                      <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Supported Formats */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground mr-2">Supported formats:</span>
        <Badge variant="outline">PDF</Badge>
        <Badge variant="outline">DOCX</Badge>
        <Badge variant="outline">PPTX</Badge>
        <Badge variant="outline">XLSX</Badge>
        <Badge variant="outline">TXT</Badge>
        <Badge variant="outline">MD</Badge>
      </div>
    </div>
  );
}
