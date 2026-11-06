"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Attachment } from "@/types";
import { DocumentCard } from "./document-card";
import {
  isImageFile,
  extractFileExtension,
  formatFileSize,
  sanitizeFileName,
} from "@/utils/storage";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  ImageOff,
  Eye,
} from "lucide-react";

export interface LightboxFile {
  url: string;
  name: string;
  type: string;
  size?: number;
}

export function isImageAttachment(att: Attachment | LightboxFile): boolean {
  if (att.type && isImageFile(att.type)) return true;
  const ext = extractFileExtension(att.name).toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext);
}

export function isPdfAttachment(att: Attachment | LightboxFile): boolean {
  if (att.type && att.type.toLowerCase().includes("pdf")) return true;
  const ext = extractFileExtension(att.name).toLowerCase();
  return ext === "pdf";
}

interface ImageThumbnailProps {
  image: Attachment;
  onClick: () => void;
  className?: string;
}

function ImageThumbnail({ image, onClick, className = "" }: ImageThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-center min-h-[140px] ${className}`}
      >
        <ImageOff className="w-7 h-7 text-neutral-400 mb-1.5" />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Failed to load image
        </span>
        <span className="text-[11px] text-neutral-400 truncate max-w-[180px] mt-0.5">
          {image.name}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 cursor-pointer shadow-xs hover:shadow-md transition ${className}`}
    >
      {/* Skeleton Loading Pulse */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      )}

      <img
        src={image.url}
        alt={image.name}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition duration-300 group-hover:scale-105 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Hover Zoom Overlay */}
      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <div className="p-2 rounded-full bg-black/60 text-white shadow-lg">
          <ZoomIn className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export interface AttachmentPreviewProps {
  attachments?: Attachment[];
  className?: string;
}

export function AttachmentPreview({ attachments, className = "" }: AttachmentPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(isImageAttachment);
  const documents = attachments.filter((att) => !isImageAttachment(att));

  // Full item list for lightbox navigation
  const allFiles: LightboxFile[] = attachments.map((a) => ({
    url: a.url,
    name: a.name,
    type: a.type || "",
    size: a.size,
  }));

  const handleOpenLightbox = (fileIndex: number) => {
    setActiveIndex(fileIndex);
    setLightboxOpen(true);
  };

  const handleOpenImage = (img: Attachment) => {
    const idx = allFiles.findIndex((f) => f.url === img.url);
    handleOpenLightbox(idx >= 0 ? idx : 0);
  };

  const handleOpenDoc = (doc: Attachment) => {
    const idx = allFiles.findIndex((f) => f.url === doc.url);
    handleOpenLightbox(idx >= 0 ? idx : 0);
  };

  return (
    <div className={`mt-2.5 space-y-2.5 ${className}`}>
      {/* 1. Image Attachments Grid Layout */}
      {images.length > 0 && (
        <div>
          {images.length === 1 && (
            <div className="max-w-sm sm:max-w-md max-h-80 w-auto">
              <ImageThumbnail
                image={images[0]}
                onClick={() => handleOpenImage(images[0])}
                className="max-h-80 w-auto"
              />
            </div>
          )}

          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.map((img) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenImage(img)}
                  className="aspect-[4/3] w-full"
                />
              ))}
            </div>
          )}

          {images.length === 3 && (
            <div className="grid grid-cols-3 gap-2 max-w-lg w-full">
              {images.map((img) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenImage(img)}
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}

          {images.length === 4 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.map((img) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenImage(img)}
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}

          {images.length > 4 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.slice(0, 3).map((img) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenImage(img)}
                  className="aspect-square w-full"
                />
              ))}
              <div
                onClick={() => handleOpenImage(images[3])}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group shadow-xs border border-neutral-200 dark:border-neutral-800"
              >
                <img
                  src={images[3].url}
                  alt={images[3].name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-lg group-hover:bg-neutral-950/60 transition">
                  +{images.length - 3}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Non-Image Document Cards List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isPdf = isPdfAttachment(doc);
            return (
              <div
                key={doc.id || doc.url}
                className="relative group/doc max-w-md w-full"
              >
                <DocumentCard attachment={doc} />
                {isPdf && (
                  <button
                    type="button"
                    onClick={() => handleOpenDoc(doc)}
                    className="absolute right-20 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 transition cursor-pointer flex items-center space-x-1"
                    title="View PDF directly in Kaelixo"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. In-App Media & Document Lightbox Viewer */}
      {lightboxOpen && allFiles.length > 0 && (
        <SlackMediaLightbox
          files={allFiles}
          currentIndex={activeIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIdx) => setActiveIndex(newIdx)}
        />
      )}
    </div>
  );
}

interface SlackMediaLightboxProps {
  files: LightboxFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export function SlackMediaLightbox({
  files,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: SlackMediaLightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex, isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const currentFile = files[index];
  const isImage = currentFile ? isImageAttachment(currentFile) : false;
  const isPdf = currentFile ? isPdfAttachment(currentFile) : false;

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    if (files.length <= 1) return;
    const newIdx = index === 0 ? files.length - 1 : index - 1;
    setIndex(newIdx);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIdx);
  }, [files.length, index, onNavigate]);

  const handleNext = useCallback(() => {
    if (files.length <= 1) return;
    const newIdx = index === files.length - 1 ? 0 : index + 1;
    setIndex(newIdx);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIdx);
  }, [files.length, index, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Drag-to-pan handling when zoomed in (images)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(2);
    }
  };

  const handleDownload = async () => {
    if (!currentFile) return;
    const cleanName = sanitizeFileName(currentFile.name);
    try {
      const res = await fetch(currentFile.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(currentFile.url, "_blank");
    }
  };

  if (!isOpen || !currentFile) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={currentFile.name || "Attachment Preview Lightbox"}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Top Header & Action Controls Bar */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white/90 bg-neutral-950/70 border-b border-white/10 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: File Info */}
        <div className="flex items-center space-x-3 min-w-0 pr-4">
          <div className="truncate">
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {sanitizeFileName(currentFile.name)}
            </h4>
            <p className="text-xs text-neutral-400">
              {files.length > 1 && `File ${index + 1} of ${files.length} • `}
              {isPdf ? "PDF Document" : isImage ? "Image Preview" : "Document"}
              {currentFile.size ? ` • ${formatFileSize(currentFile.size)}` : ""}
            </p>
          </div>
        </div>

        {/* Right: Zoom & Tool Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition disabled:opacity-30 cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom % Pill */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-mono font-medium text-white/90 transition cursor-pointer"
            title="Reset Zoom (0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition disabled:opacity-30 cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="h-4 w-[1px] bg-white/20 mx-1" />

          {/* Reset Zoom Icon */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
            title="Download File"
            aria-label="Download File"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open Original */}
          <a
            href={currentFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
            title="Open Original in New Tab"
            aria-label="Open original"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-rose-500/80 rounded-lg text-white/80 hover:text-white transition ml-1 cursor-pointer"
            title="Close (Esc)"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-4"
        onMouseDown={isImage ? handleMouseDown : undefined}
        onMouseMove={isImage ? handleMouseMove : undefined}
        onMouseUp={isImage ? handleMouseUp : undefined}
        style={{
          cursor: isImage && zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {isPdf ? (
          /* Slack-Style In-App PDF Preview Viewer */
          <div
            className="w-full max-w-5xl h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-neutral-700 transition-transform duration-100 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              src={`${currentFile.url}#toolbar=1`}
              title={currentFile.name}
              className="w-full h-full border-0"
            />
          </div>
        ) : isImage ? (
          /* In-App Image Viewer with Zoom & Pan */
          <img
            src={currentFile.url}
            alt={currentFile.name}
            onDoubleClick={handleDoubleClick}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-lg transition-transform duration-100 ease-out select-none shadow-2xl"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
            draggable={false}
          />
        ) : (
          /* Non-previewable Document Card in Center */
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-8 rounded-2xl bg-neutral-900 border border-neutral-700 max-w-md w-full text-center space-y-4 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{currentFile.name}</h4>
              <p className="text-xs text-neutral-400 mt-1">
                {currentFile.size ? formatFileSize(currentFile.size) : "Document"}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <a
                href={currentFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>
        )}

        {/* Previous Button */}
        {files.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Previous (Left Arrow)"
            aria-label="Previous file"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {files.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Next (Right Arrow)"
            aria-label="Next file"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (When >1 file) */}
      {files.length > 1 && (
        <div
          className="p-3 bg-neutral-950/70 border-t border-white/10 flex items-center justify-center space-x-2 overflow-x-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {files.map((file, i) => (
            <button
              key={file.url || i}
              type="button"
              onClick={() => {
                setIndex(i);
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition flex-shrink-0 cursor-pointer bg-neutral-800 flex items-center justify-center ${
                i === index
                  ? "border-indigo-500 scale-105 shadow-md"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {isImageAttachment(file) ? (
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-neutral-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
