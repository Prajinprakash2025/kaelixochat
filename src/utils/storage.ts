import { createClient } from "@/lib/supabase/client";
import { Attachment, FileCategory } from "@/types";

export const ATTACHMENT_BUCKET = "kaelixo-attachments";
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Allowed MIME types for attachments in Kaelixo
 */
export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  // Office formats
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
]);

/**
 * Safe extensions whitelist for attachments with generic or empty MIME type
 */
export const SAFE_FILE_EXTENSIONS = new Set([
  // Images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  // Videos
  "mp4",
  "webm",
  "mov",
  "mkv",
  "ogg",
  "m4v",
  // Audio
  "mp3",
  "wav",
  // Documents
  "pdf",
  "txt",
  "md",
  "csv",
  "json",
  // Archives
  "zip",
  // Office formats
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

/**
 * Dangerous executable, script, and system extensions strictly disallowed
 */
export const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "sh",
  "bat",
  "cmd",
  "com",
  "msi",
  "msp",
  "vbs",
  "vbe",
  "wsf",
  "wsh",
  "ps1",
  "ps1xml",
  "ps2",
  "ps2xml",
  "psc1",
  "psc2",
  "msc",
  "jar",
  "dll",
  "scr",
  "pif",
  "hta",
  "cpl",
  "sys",
  "reg",
]);

/**
 * Safely extracts lowercase file extension without leading dot.
 * Returns empty string if no valid dot extension exists.
 */
export function extractFileExtension(filename: string): string {
  if (!filename || !filename.includes(".")) return "";
  const parts = filename.split(".");
  const ext = parts.pop();
  return ext ? ext.toLowerCase().trim() : "";
}

/**
 * Sanitizes a filename to prevent directory traversal and remove unsafe characters.
 * Truncates long filenames while preserving the extension.
 * Eliminates trailing dots on degenerate dot-only inputs.
 */
export function sanitizeFileName(originalName: string): string {
  if (!originalName || originalName.trim() === "") {
    return "attachment";
  }

  // Strip null bytes to prevent null-byte poisoning
  const sanitizedInput = originalName.replace(/\0/g, "");

  const parts = sanitizedInput.split(".");
  const cleanExt = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const extension = cleanExt ? `.${cleanExt}` : "";

  const baseName = parts.join(".")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  const cleanBase = baseName || "attachment";
  return `${cleanBase}${extension}`;
}

/**
 * Sanitizes channel ID to prevent directory traversal in storage paths.
 */
export function sanitizeChannelId(channelId: string): string {
  return channelId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Determines high-level file category for UI rendering and icon display.
 */
export function getFileCategory(mimeType: string, filename: string): FileCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (isVideoFile(mimeType) || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(filename)) return "video";
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  if (
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    filename.endsWith(".ts") ||
    filename.endsWith(".tsx") ||
    filename.endsWith(".js") ||
    filename.endsWith(".py") ||
    filename.endsWith(".sql")
  ) {
    return "code";
  }
  return "file";
}

/**
 * Returns true if the MIME type represents an inline-renderable image.
 */
export function isImageFile(mimeType: string): boolean {
  return Boolean(mimeType && mimeType.startsWith("image/"));
}

/**
 * Returns true if the MIME type or extension represents a playable video.
 */
export function isVideoFile(mimeType: string): boolean {
  if (!mimeType) return false;
  const lower = mimeType.toLowerCase();
  return lower.startsWith("video/") || lower === "application/mp4";
}

/**
 * Formats byte size into human-readable text (e.g. "2.4 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates file size, filename, and MIME type/extension.
 * Throws informative error if validation fails.
 */
export function validateAttachment(file: File): void {
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  if (!file.name || file.name.trim() === "") {
    throw new Error("Invalid attachment: filename cannot be blank.");
  }
  if (file.size < 0) {
    throw new Error("Invalid attachment: file size cannot be negative.");
  }
  if (file.size === 0) {
    throw new Error("Cannot upload empty file (0 bytes).");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed limit of ${formatFileSize(
        MAX_FILE_SIZE_BYTES
      )}.`
    );
  }

  const ext = extractFileExtension(file.name);

  // 1. Strict guard: Reject dangerous executable and script extensions unconditionally
  if (ext && DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file type: dangerous executable/script file (.${ext}) is strictly prohibited.`
    );
  }

  // 2. MIME type & extension validation
  const mimeType = file.type ? file.type.trim().toLowerCase() : "";

  if (!mimeType || mimeType === "application/octet-stream") {
    // Missing, empty, or generic binary stream: strictly enforce safe extension whitelist
    if (!ext || !SAFE_FILE_EXTENSIONS.has(ext)) {
      throw new Error(
        `Unsupported file type: "${mimeType || "unspecified"}". Extension ".${ext || ""}" is not allowed. Please upload a standard image or document.`
      );
    }
  } else {
    // Explicit MIME type provided: verify against allowed MIME types
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        `Unsupported file type: ${file.type}. Please upload a standard image or document.`
      );
    }
  }
}

/**
 * Uploads a file attachment with progress tracking via XMLHttpRequest.
 */
async function uploadWithXHR(
  file: File,
  storagePath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables for upload.");
  }

  const endpoint = `${supabaseUrl}/storage/v1/object/${ATTACHMENT_BUCKET}/${storagePath}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    xhr.setRequestHeader("Authorization", `Bearer ${supabaseKey}`);
    xhr.setRequestHeader("apikey", supabaseKey);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.message || errRes.error || `Upload failed with HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error during file upload. Please check your connection."));
    xhr.onabort = () => reject(new Error("File upload was cancelled."));

    xhr.send(file);
  });
}

/**
 * Main Upload Function: Validates, sanitizes path, uploads to Supabase Storage,
 * tracks progress, and returns complete Attachment object.
 */
export async function uploadAttachment(
  file: File,
  channelId: string,
  onProgress?: (percent: number) => void
): Promise<Attachment> {
  // 1. Validation
  validateAttachment(file);

  // 2. Path sanitization
  const cleanChannelId = sanitizeChannelId(channelId);
  const cleanFileName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const storagePath = `${cleanChannelId}/${timestamp}-${cleanFileName}`;

  const supabase = createClient();

  // 3. Upload execution
  if (onProgress && typeof XMLHttpRequest !== "undefined") {
    try {
      await uploadWithXHR(file, storagePath, onProgress);
    } catch (xhrError) {
      console.warn("XHR upload progress failed, falling back to standard client upload:", xhrError);
      // Fallback to standard SDK upload
      const { error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (error) throw error;
      onProgress(100);
    }
  } else {
    const { error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    if (onProgress) {
      onProgress(100);
    }
  }

  // 4. Resolve Public URL
  const { data: urlData } = supabase.storage
    .from(ATTACHMENT_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded attachment.");
  }

  // 5. Build and return Attachment model matching interface contract
  return {
    id: `att-${timestamp}-${Math.random().toString(36).substring(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    url: urlData.publicUrl,
    storagePath: storagePath,
  };
}

/**
 * Deletes an uploaded attachment from storage.
 */
export async function deleteAttachment(storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete storage file: ${error.message}`);
  }
}

/**
 * Uploads a profile avatar image to Supabase Storage in kaelixo-attachments/avatars.
 * Returns the permanent public CDN URL.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  validateAttachment(file);
  const cleanUserId = sanitizeChannelId(userId || "avatars");
  const cleanFileName = sanitizeFileName(file.name);
  const timestamp = Date.now();
  const storagePath = `avatars/${cleanUserId}/${timestamp}-${cleanFileName}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(ATTACHMENT_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to get public URL for avatar");
  }

  return urlData.publicUrl;
}
