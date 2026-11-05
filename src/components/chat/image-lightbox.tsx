"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Attachment } from "@/types";
import { formatFileSize, sanitizeFileName } from "@/utils/storage";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface ImageLightboxProps {
  images: Attachment[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
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

  // Lock body scroll on mount
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const currentImage = images[index];

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
    if (images.length <= 1) return;
    const newIdx = index === 0 ? images.length - 1 : index - 1;
    setIndex(newIdx);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIdx);
  }, [images.length, index, onNavigate]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    const newIdx = index === images.length - 1 ? 0 : index + 1;
    setIndex(newIdx);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (onNavigate) onNavigate(newIdx);
  }, [images.length, index, onNavigate]);

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

  // Drag-to-pan handling when zoomed in
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
    if (!currentImage) return;
    const cleanName = sanitizeFileName(currentImage.name);
    try {
      const res = await fetch(currentImage.url);
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
      window.open(currentImage.url, "_blank");
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={currentImage.name || "Image Preview Lightbox"}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Top Header & Action Controls Bar */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white/90 bg-neutral-950/60 border-b border-white/10 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Image Info */}
        <div className="flex items-center space-x-3 min-w-0 pr-4">
          <div className="truncate">
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {sanitizeFileName(currentImage.name)}
            </h4>
            <p className="text-xs text-neutral-400">
              {images.length > 1 && `Image ${index + 1} of ${images.length} • `}
              {formatFileSize(currentImage.size)}
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
            title="Download Image"
            aria-label="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Open Original */}
          <a
            href={currentImage.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
            title="Open Original"
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        <img
          src={currentImage.url}
          alt={currentImage.name}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[90vw] max-h-[82vh] object-contain rounded-lg transition-transform duration-100 ease-out select-none shadow-2xl"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
          draggable={false}
        />

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Previous (Left Arrow)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Next (Right Arrow)"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (When >1 image) */}
      {images.length > 1 && (
        <div
          className="p-3 bg-neutral-950/70 border-t border-white/10 flex items-center justify-center space-x-2 overflow-x-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id || img.url}
              type="button"
              onClick={() => {
                setIndex(i);
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                i === index
                  ? "border-indigo-500 scale-105 shadow-md"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
