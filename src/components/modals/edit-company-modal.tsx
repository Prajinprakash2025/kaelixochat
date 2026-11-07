"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Check } from "lucide-react";
import { Organization } from "@/types";
import { uploadAttachment } from "@/utils/storage";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrg: Organization;
  onUpdateCompany: (orgId: string, updates: { name: string; logo_url?: string | null }) => Promise<void>;
}

export function EditCompanyModal({
  isOpen,
  onClose,
  activeOrg,
  onUpdateCompany,
}: EditCompanyModalProps) {
  const [name, setName] = useState(activeOrg.name);
  const [logoUrl, setLogoUrl] = useState(activeOrg.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(activeOrg.name);
      setLogoUrl(activeOrg.logo_url || "");
      setError(null);
    }
  }, [isOpen, activeOrg]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, SVG, WebP)");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const attachment = await uploadAttachment(file, "company-logos");
      if (attachment?.url) {
        setLogoUrl(attachment.url);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onUpdateCompany(activeOrg.id, {
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update company profile";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const presetLogos = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=128&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=128&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=128&auto=format&fit=crop&q=80",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-neutral-900 dark:text-neutral-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight">
              Edit workspace details
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Update company name and branding across your team
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Company Name Input */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
              Company name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              This is the primary name shown in your workspace header and navigation rail.
            </p>
          </div>

          {/* Logo Section */}
          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
              Company logo
            </label>

            <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
              {/* Logo Preview Box */}
              <div className="w-24 h-24 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo Preview"
                    className="w-full h-full object-cover"
                    onError={() => setLogoUrl("")}
                  />
                ) : (
                  <span className="font-extrabold text-2xl text-neutral-600 dark:text-neutral-300">
                    {name.charAt(0).toUpperCase() || "C"}
                  </span>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-2 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition text-center cursor-pointer shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? "Uploading..." : "Upload photo"}</span>
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer block"
                  >
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Recommended: Square PNG, SVG or JPG (min 128x128px)
                </p>
              </div>
            </div>

            {/* Logo Presets */}
            <div className="mt-4">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold block mb-2">
                Or select a preset logo:
              </span>
              <div className="flex items-center space-x-2">
                {presetLogos.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLogoUrl(preset)}
                    className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                      logoUrl === preset ? "border-emerald-600 ring-2 ring-emerald-500/40" : "border-neutral-300 dark:border-neutral-700 hover:opacity-80"
                    }`}
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-sm font-bold text-white bg-[#007a5a] hover:bg-[#006a4e] rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
