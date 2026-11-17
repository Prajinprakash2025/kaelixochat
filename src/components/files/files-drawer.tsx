"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FileText,
  Download,
  Share2,
  ExternalLink,
  Search,
  Star,
  FileSpreadsheet,
  FileCode,
  Film,
  Music,
  Image as ImageIcon,
  HardDrive,
  Copy,
  Check,
  UploadCloud,
} from "lucide-react";
import { WorkspaceMember, Message, Attachment } from "@/types";
import { createClient } from "@/lib/supabase/client";

export interface WorkspaceFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploaderName: string;
  channelId?: string;
  channelName?: string;
  createdAt: string;
  isStarred?: boolean;
}

interface FilesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkspaceMember;
  messagesByChannel: Record<string, Message[]>;
  channelIdFilter?: string; // If provided, shows files for specific channel
  channelName?: string;
}

// Sample workspace documents matching user's Slack reference
const SAMPLE_FILES: WorkspaceFileItem[] = [
  {
    id: "f-1",
    name: "Website_Client_Requirement_Collection_Form.pdf",
    size: "248 KB",
    type: "application/pdf",
    url: "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/sample/Website_Client_Requirement_Collection_Form.pdf",
    uploaderName: "Prajin Prakash",
    channelName: "general",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    isStarred: true,
  },
  {
    id: "f-2",
    name: "Shahinsha_Kabeer_Video_Editor_Resume.pdf",
    size: "1.4 MB",
    type: "application/pdf",
    url: "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/sample/Shahinsha_Kabeer_Resume.pdf",
    uploaderName: "Prajin Prakash",
    channelName: "dev-sprint",
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
  },
  {
    id: "f-3",
    name: "Himanshi-1-1.pdf",
    size: "520 KB",
    type: "application/pdf",
    url: "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/sample/Himanshi-1-1.pdf",
    uploaderName: "Aparna Sharma",
    channelName: "teaching-hub",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "f-4",
    name: "New_Confirmations_Report_Oct_2026.xlsx",
    size: "9 KB",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    url: "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/33333333-3333-3333-3333-333333333333/1793955252514-New_Confirmations_Report_Oct_2026.xlsx",
    uploaderName: "Prajin Prakash",
    channelName: "telecalling-leads",
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    isStarred: true,
  },
  {
    id: "f-5",
    name: "Logo final.pdf",
    size: "890 KB",
    type: "application/pdf",
    url: "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/sample/Logo_final.pdf",
    uploaderName: "Prajin Prakash",
    channelName: "announcements",
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

function formatTimeAgo(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay >= 30) {
      const months = Math.floor(diffDay / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffMin > 0) return `${diffMin} min ago`;
    return "just now";
  } catch {
    return "recently";
  }
}

export function FilesDrawer({
  isOpen,
  onClose,
  currentUser,
  messagesByChannel,
  channelIdFilter,
  channelName,
}: FilesDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeTab, setActiveTypeTab] = useState<"all" | "pdf" | "images" | "sheets">("all");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [starredSet, setStarredSet] = useState<Set<string>>(() => new Set(["f-1", "f-4"]));
  const [remoteFiles, setRemoteFiles] = useState<WorkspaceFileItem[]>([]);

  const supabase = createClient();

  // Load live attachments from Supabase database
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchAttachments() {
      try {
        let query = supabase.from("attachments").select("*").order("created_at", { ascending: false });
        if (channelIdFilter) {
          query = query.eq("channel_id", channelIdFilter);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0 && isMounted) {
          const mapped: WorkspaceFileItem[] = data.map((d: any) => ({
            id: d.id,
            name: d.file_name || "Attachment",
            size: d.file_size || "100 KB",
            type: d.mime_type || d.file_type || "application/octet-stream",
            url: d.url,
            uploaderName: d.uploader_name || "Team Member",
            channelId: d.channel_id,
            createdAt: d.created_at || new Date().toISOString(),
          }));
          setRemoteFiles(mapped);
        }
      } catch (err) {
        console.warn("Could not fetch remote attachments:", err);
      }
    }

    fetchAttachments();
    return () => {
      isMounted = false;
    };
  }, [isOpen, channelIdFilter]);

  // Aggregate files from messages and remote
  const allFiles = useMemo(() => {
    const fileMap = new Map<string, WorkspaceFileItem>();

    // 1. Add sample files if not filtering by specific channel
    if (!channelIdFilter) {
      SAMPLE_FILES.forEach((f) => fileMap.set(f.id, f));
    }

    // 2. Add local attachments from messagesByChannel
    for (const [chId, msgs] of Object.entries(messagesByChannel)) {
      if (channelIdFilter && chId !== channelIdFilter) continue;
      for (const m of msgs) {
        if (m.attachments && m.attachments.length > 0) {
          for (const att of m.attachments) {
            fileMap.set(att.id || att.storagePath || att.url, {
              id: att.id || att.storagePath || att.url,
              name: att.name,
              size: `${Math.round(att.size / 1024)} KB`,
              type: att.type,
              url: att.url,
              uploaderName: m.sender?.name || m.senderName || "Member",
              channelId: chId,
              createdAt: m.createdAt || m.rawTimestamp || new Date().toISOString(),
            });
          }
        }
      }
    }

    // 3. Add remote files from Supabase
    remoteFiles.forEach((rf) => fileMap.set(rf.id, rf));

    return Array.from(fileMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messagesByChannel, remoteFiles, channelIdFilter]);

  // Filtered list
  const filteredFiles = useMemo(() => {
    return allFiles.filter((file) => {
      if (onlyStarred && !starredSet.has(file.id)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = file.name.toLowerCase().includes(q);
        const matchesUploader = file.uploaderName.toLowerCase().includes(q);
        if (!matchesName && !matchesUploader) return false;
      }

      if (activeTypeTab === "pdf") {
        return file.type.includes("pdf") || file.name.endsWith(".pdf");
      }
      if (activeTypeTab === "images") {
        return file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
      }
      if (activeTypeTab === "sheets") {
        return (
          file.type.includes("sheet") ||
          file.type.includes("excel") ||
          file.type.includes("csv") ||
          /\.(xlsx|xls|csv)$/i.test(file.name)
        );
      }

      return true;
    });
  }, [allFiles, searchQuery, activeTypeTab, onlyStarred, starredSet]);

  const toggleStar = (id: string) => {
    setStarredSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyFileLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex">
      {/* Overlay backdrop on small screens */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs md:hidden"
      />

      {/* Slide-out Flyout Panel */}
      <aside
        style={{
          backgroundColor: "var(--theme-sidebar-bg, #1e1b2e)",
          borderColor: "var(--theme-sidebar-border, rgba(255,255,255,0.12))",
          color: "var(--theme-sidebar-text, #ffffff)",
        }}
        className="relative w-80 sm:w-96 md:w-[420px] h-full flex flex-col border-r shadow-2xl z-50 select-none animate-in slide-in-from-left duration-200"
      >
        {/* Header matching Slack screenshot */}
        <div
          style={{ borderColor: "var(--theme-sidebar-border, rgba(255,255,255,0.12))" }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {channelName ? `Files in #${channelName}` : "Files"}
              </h2>
              <p
                style={{ color: "var(--theme-sidebar-muted, #94a3b8)" }}
                className="text-xs"
              >
                {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Starred Toggle Switch */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
                onlyStarred
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                  : "bg-white/10 text-neutral-300 border-white/10 hover:bg-white/15"
              }`}
              title="Filter Starred Files"
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? "fill-amber-300" : ""}`} />
              <span>Starred</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
              title="Close Files"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/10">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 opacity-60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-black/20 dark:bg-white/10 border border-white/10 placeholder-neutral-400 focus:outline-none focus:border-indigo-400 transition"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center space-x-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTypeTab("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex-shrink-0 ${
                activeTypeTab === "all"
                  ? "bg-white/25 text-white font-bold"
                  : "opacity-70 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              All Files
            </button>
            <button
              onClick={() => setActiveTypeTab("pdf")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex-shrink-0 ${
                activeTypeTab === "pdf"
                  ? "bg-rose-500/30 text-rose-300 font-bold"
                  : "opacity-70 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setActiveTypeTab("images")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex-shrink-0 ${
                activeTypeTab === "images"
                  ? "bg-indigo-500/30 text-indigo-300 font-bold"
                  : "opacity-70 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTypeTab("sheets")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex-shrink-0 ${
                activeTypeTab === "sheets"
                  ? "bg-emerald-500/30 text-emerald-300 font-bold"
                  : "opacity-70 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              Spreadsheets
            </button>
          </div>
        </div>

        {/* Files List matching Slack screenshot */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredFiles.length === 0 ? (
            <div className="py-16 text-center px-4">
              <UploadCloud className="w-10 h-10 mx-auto opacity-40 mb-3" />
              <p className="text-sm font-semibold opacity-90">No files found</p>
              <p
                style={{ color: "var(--theme-sidebar-muted, #94a3b8)" }}
                className="text-xs mt-1"
              >
                Files, documents, and media shared in channels will be organized here.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isPdf = file.type.includes("pdf") || file.name.endsWith(".pdf");
              const isImg = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(file.name);
              const isSheet =
                file.type.includes("sheet") ||
                file.type.includes("excel") ||
                file.type.includes("csv") ||
                /\.(xlsx|xls|csv)$/i.test(file.name);
              const isVid = file.type.startsWith("video/") || /\.(mp4|mov)$/i.test(file.name);
              const isStarred = starredSet.has(file.id);

              return (
                <div
                  key={file.id}
                  className="group relative flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    {/* Left Icon Badge (Red for PDF matching screenshot) */}
                    <div className="flex-shrink-0">
                      {isPdf ? (
                        <div className="w-9 h-9 rounded-lg bg-rose-600 flex flex-col items-center justify-center text-white shadow-xs">
                          <FileText className="w-4 h-4" />
                          <span className="text-[8px] font-extrabold uppercase leading-none mt-0.5">
                            PDF
                          </span>
                        </div>
                      ) : isImg ? (
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-800 border border-white/10 flex items-center justify-center">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : isSheet ? (
                        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex flex-col items-center justify-center text-white shadow-xs">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="text-[8px] font-extrabold uppercase leading-none mt-0.5">
                            XLS
                          </span>
                        </div>
                      ) : isVid ? (
                        <div className="w-9 h-9 rounded-lg bg-purple-600 flex flex-col items-center justify-center text-white shadow-xs">
                          <Film className="w-4 h-4" />
                          <span className="text-[8px] font-extrabold uppercase leading-none mt-0.5">
                            MP4
                          </span>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-sky-600 flex flex-col items-center justify-center text-white shadow-xs">
                          <FileText className="w-4 h-4" />
                          <span className="text-[8px] font-extrabold uppercase leading-none mt-0.5">
                            FILE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* File metadata */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold truncate group-hover:text-indigo-300 transition"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p
                        style={{ color: "var(--theme-sidebar-muted, #94a3b8)" }}
                        className="text-[11px] truncate flex items-center space-x-1.5 mt-0.5"
                      >
                        <span className="font-medium text-neutral-300">{file.uploaderName}</span>
                        <span>•</span>
                        <span>Updated {formatTimeAgo(file.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono">{file.size}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file.id);
                      }}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isStarred
                          ? "text-amber-300 hover:bg-amber-400/20"
                          : "opacity-40 hover:opacity-100 hover:bg-white/10"
                      }`}
                      title={isStarred ? "Unstar File" : "Star File"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-amber-300" : ""}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyFileLink(file.url, file.id);
                      }}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                      title="Copy Public Link"
                    >
                      {copiedId === file.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                      title="Download / Open File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info note matching Slack screenshot */}
        <div
          style={{ borderColor: "var(--theme-sidebar-border, rgba(255,255,255,0.12))" }}
          className="p-3 border-t bg-black/10 dark:bg-black/30 flex items-center justify-between text-[11px]"
        >
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span style={{ color: "var(--theme-sidebar-muted, #94a3b8)" }}>
              Kaelixo Encrypted Cloud Storage
            </span>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            PRO
          </span>
        </div>
      </aside>
    </div>
  );
}
