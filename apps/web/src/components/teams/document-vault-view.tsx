"use client";

import React, { useState } from "react";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { Team, TeamDocument, User, api } from "@/lib/api-client";

interface DocumentVaultViewProps {
  team: Team;
  currentUser: User | null;
  onDocumentsUpdated: () => void;
}

export const DocumentVaultView: React.FC<DocumentVaultViewProps> = ({
  team,
  currentUser,
  onDocumentsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileType, setFileType] = useState("application/pdf");
  const [isUploading, setIsUploading] = useState(false);

  const documents = team.documents || [];

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-6 w-6 text-red-500" />;
    if (type.includes("image")) return <FileImage className="h-6 w-6 text-emerald-500" />;
    if (type.includes("sheet") || type.includes("csv"))
      return <FileSpreadsheet className="h-6 w-6 text-emerald-600" />;
    if (type.includes("json") || type.includes("code") || type.includes("javascript"))
      return <FileCode className="h-6 w-6 text-amber-500" />;
    return <FileText className="h-6 w-6 text-indigo-500" />;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsUploading(true);
      await api.uploadTeamDocument(team.id, {
        name: name.trim(),
        url: `https://example.com/vault/${encodeURIComponent(name.trim())}`,
        fileType,
        sizeBytes: Math.floor(Math.random() * 5000000) + 50000,
        description: description.trim(),
      });
      setName("");
      setDescription("");
      setShowUploadModal(false);
      onDocumentsUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this shared document?")) return;
    try {
      await api.deleteTeamDocument(docId);
      onDocumentsUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  const isViewer = team.currentUserRole === "VIEWER";

  return (
    <div className="flex h-full flex-col p-8 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A3B899]/30 text-[#3C5034] dark:bg-[#A3B899]/20 dark:text-[#A3B899]">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Document Vault
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shared team specifications, research papers, design tokens & assets
            </p>
          </div>
        </div>

        {/* Upload Button */}
        {!isViewer && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#6F8863] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#5E7653] dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search team documents & specifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white/90 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-[#A3B899] focus:outline-none focus:ring-2 focus:ring-[#A3B899]/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <FileText className="h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            No documents found
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {searchQuery ? "Try a different search term." : "Upload your first team document to share with everyone."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc: TeamDocument) => {
            const sizeMb = (doc.sizeBytes / (1024 * 1024)).toFixed(1);
            const canDelete =
              doc.uploaderId === currentUser?.id ||
              team.currentUserRole === "OWNER" ||
              team.currentUserRole === "ADMIN";

            return (
              <div
                key={doc.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-xs transition-all hover:border-[#A3B899]/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/85"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {doc.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {sizeMb} MB • {doc.fileType.split("/")[1]?.toUpperCase() || "FILE"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Footer details */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                  <span>By {doc.uploader?.name || "Member"}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#6F8863] hover:underline dark:text-[#A3B899]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Get
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Delete Document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="glass-panel relative w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Upload Team Document
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share specifications, design assets or code snippets with {team.name}
            </p>

            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Document Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. ChaosNote_Architecture_Specs.pdf"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  File Type
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="application/pdf">PDF Document (.pdf)</option>
                  <option value="application/json">JSON / Design Tokens (.json)</option>
                  <option value="image/png">Image / Mockup (.png, .jpg)</option>
                  <option value="text/markdown">Markdown Document (.md)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Brief note about this document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-800 focus:border-[#A3B899] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !name.trim()}
                  className="rounded-xl bg-[#6F8863] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#5E7653] disabled:opacity-50 dark:bg-[#A3B899] dark:text-slate-900 dark:hover:bg-[#8FA884]"
                >
                  {isUploading ? "Uploading..." : "Save to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
