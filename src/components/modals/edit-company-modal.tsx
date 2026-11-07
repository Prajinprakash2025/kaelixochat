"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, X, Upload, Sparkles, Image as ImageIcon, Check } from "lucide-react";
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
    } catch (err: any) {
      // Fallback: use FileReader for data URL preview
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
    } catch (err: any) {
      setError(err?.message || "Failed to update company profile");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Company & Workspace Settings</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Custom brand identity managed by company manager
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Logo Preview & Upload */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
              Company Logo
            </label>

            <div className="flex items-center space-x-4">
              {/* Logo Preview Box */}
              <div className="relative w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0 group">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo Preview"
                    className="w-full h-full object-cover"
                    onError={() => setLogoUrl("")}
                  />
                ) : (
                  <span className="font-black text-xl text-neutral-600 dark:text-neutral-300">
                    {name.charAt(0).toUpperCase() || "C"}
                  </span>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-1.5">
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
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? "Uploading..." : "Upload Logo"}</span>
                </button>
                <p className="text-[11px] text-neutral-500">
                  Recommended: Square PNG, SVG or JPG (min 128x128px)
                </p>
              </div>
            </div>

            {/* Logo Presets */}
            <div className="mt-3">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1.5">
                Or choose a brand gradient preset:
              </span>
              <div className="flex items-center space-x-2">
                {presetLogos.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLogoUrl(preset)}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      logoUrl === preset ? "border-indigo-600 ring-2 ring-indigo-500/40" : "border-neutral-200 dark:border-neutral-700 hover:opacity-80"
                    }`}
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-[11px] text-neutral-400 hover:text-rose-500 ml-2 transition cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Company Name Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dream Home, Acme Corp"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Company Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
