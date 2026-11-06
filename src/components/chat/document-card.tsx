"use client";

import React, { useState } from "react";
import { Attachment } from "@/types";
import { formatFileSize, sanitizeFileName, extractFileExtension } from "@/utils/storage";
import {
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  File,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface DocumentCardProps {
  attachment: Attachment;
  className?: string;
}

interface FileVisuals {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  badge: string;
}

export function getFileVisuals(mimeType: string, filename: string): FileVisuals {
  const ext = extractFileExtension(filename);
  const lowerMime = (mimeType || "").toLowerCase();

  // PDF
  if (lowerMime === "application/pdf" || ext === "pdf") {
    return {
      icon: FileText,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/50",
      borderColor: "border-rose-200 dark:border-rose-900/40",
      badge: "PDF",
    };
  }

  // Code / Structured data
  if (
    lowerMime.includes("json") ||
    lowerMime.includes("javascript") ||
    lowerMime.includes("typescript") ||
    lowerMime.includes("html") ||
    lowerMime.includes("css") ||
    ["ts", "tsx", "js", "jsx", "py", "sql", "json", "md", "html", "css", "yaml", "yml"].includes(ext)
  ) {
    return {
      icon: FileCode,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/50",
      borderColor: "border-violet-200 dark:border-violet-900/40",
      badge: ext.toUpperCase() || "CODE",
    };
  }

  // Spreadsheets
  if (
    lowerMime.includes("excel") ||
    lowerMime.includes("spreadsheet") ||
    lowerMime.includes("csv") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return {
      icon: FileSpreadsheet,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-emerald-200 dark:border-emerald-900/40",
      badge: ext.toUpperCase() || "SHEET",
    };
  }

  // Word / Office Documents
  if (
    lowerMime.includes("word") ||
    lowerMime.includes("officedocument") ||
    ["doc", "docx"].includes(ext)
  ) {
    return {
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      borderColor: "border-blue-200 dark:border-blue-900/40",
      badge: "DOC",
    };
  }

  // Archives
  if (
    lowerMime.includes("zip") ||
    lowerMime.includes("tar") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return {
      icon: FileArchive,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-amber-200 dark:border-amber-900/40",
      badge: "ZIP",
    };
  }

  // Media
  if (lowerMime.startsWith("audio/")) {
    return {
      icon: FileAudio,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      borderColor: "border-purple-200 dark:border-purple-900/40",
      badge: "AUDIO",
    };
  }
  if (lowerMime.startsWith("video/")) {
    return {
      icon: FileVideo,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      borderColor: "border-purple-200 dark:border-purple-900/40",
      badge: "VIDEO",
    };
  }

  // Generic fallback
  return {
    icon: File,
    color: "text-neutral-600 dark:text-neutral-400",
    bgColor: "bg-neutral-100 dark:bg-neutral-800",
    borderColor: "border-neutral-200 dark:border-neutral-700",
    badge: ext ? ext.toUpperCase() : "FILE",
  };
}

export function DocumentCard({ attachment, className = "" }: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const visuals = getFileVisuals(attachment.type, attachment.name);
  const IconComponent = visuals.icon;
  const cleanName = sanitizeFileName(attachment.name);
  const displaySize = attachment.size > 0 ? formatFileSize(attachment.size) : "Unknown size";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback for CORS-restricted environments
      window.open(attachment.url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-xs transition max-w-md w-full ${className}`}
    >
      {/* Left Icon Box with Type Badge */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${visuals.bgColor} ${visuals.borderColor} ${visuals.color}`}
      >
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Middle: Name and Metadata */}
      <div className="flex-1 min-w-0 mx-3">
        <p
          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
          title={attachment.name}
        >
          {cleanName}
        </p>
        <div className="flex items-center space-x-1.5 text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
          <span>{displaySize}</span>
          <span>•</span>
          <span className="font-semibold uppercase tracking-wider text-[10px] px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {visuals.badge}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
          title={`Download ${cleanName}`}
          aria-label={`Download ${cleanName}`}
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>

        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          title="Open original file in new tab"
          aria-label="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
