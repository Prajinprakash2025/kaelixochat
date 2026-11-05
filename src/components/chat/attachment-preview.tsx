"use client";

import React, { useState } from "react";
import { Attachment } from "@/types";
import { DocumentCard } from "./document-card";
import { ImageLightbox } from "./image-lightbox";
import { isImageFile, extractFileExtension } from "@/utils/storage";
import { ZoomIn, ImageOff } from "lucide-react";

export function isImageAttachment(att: Attachment): boolean {
  if (att.type && isImageFile(att.type)) return true;
  const ext = extractFileExtension(att.name);
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext);
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(isImageAttachment);
  const documents = attachments.filter((att) => !isImageAttachment(att));

  const handleOpenLightbox = (index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
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
                onClick={() => handleOpenLightbox(0)}
                className="max-h-80 w-auto"
              />
            </div>
          )}

          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.map((img, i) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenLightbox(i)}
                  className="aspect-[4/3] w-full"
                />
              ))}
            </div>
          )}

          {images.length === 3 && (
            <div className="grid grid-cols-3 gap-2 max-w-lg w-full">
              {images.map((img, i) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenLightbox(i)}
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}

          {images.length === 4 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.map((img, i) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenLightbox(i)}
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}

          {images.length > 4 && (
            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
              {images.slice(0, 3).map((img, i) => (
                <ImageThumbnail
                  key={img.id || img.url}
                  image={img}
                  onClick={() => handleOpenLightbox(i)}
                  className="aspect-square w-full"
                />
              ))}
              <div
                onClick={() => handleOpenLightbox(3)}
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
          {documents.map((doc) => (
            <DocumentCard key={doc.id || doc.url} attachment={doc} />
          ))}
        </div>
      )}

      {/* 3. Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={activeImageIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIdx) => setActiveImageIndex(newIdx)}
        />
      )}
    </div>
  );
}
