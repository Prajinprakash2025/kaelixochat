"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Check, Trash2, AlertTriangle, Building2, ShieldAlert } from "lucide-react";
import { Organization } from "@/types";
import { uploadAttachment } from "@/utils/storage";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrg: Organization;
  organizations?: Organization[];
  onUpdateCompany: (orgId: string, updates: { name: string; logo_url?: string | null }) => Promise<void>;
  onDeleteCompany?: (orgId: string) => Promise<void> | void;
  initialTab?: "general" | "danger";
}

export function EditCompanyModal({
  isOpen,
  onClose,
  activeOrg,
  organizations = [],
  onUpdateCompany,
  onDeleteCompany,
  initialTab = "general",
}: EditCompanyModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "danger">(initialTab);
  const [name, setName] = useState(activeOrg.name);
  const [logoUrl, setLogoUrl] = useState(activeOrg.logo_url || "");
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Danger zone delete state
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setName(activeOrg.name);
      setLogoUrl(activeOrg.logo_url || "");
      setImageError(false);
      setError(null);
      setConfirmName("");
      setDeleting(false);
      setDeleteError(null);
    }
  }, [isOpen, activeOrg, initialTab]);

  if (!isOpen) return null;

  const isSoleOrg = organizations.length > 0 && organizations.length <= 1;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, SVG, WebP)");
      return;
    }

    setUploading(true);
    setError(null);
    setImageError(false);
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
      if (e.target) e.target.value = "";
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
      const msg = err instanceof Error ? err.message : "Failed to update workspace";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSoleOrg) {
      setDeleteError("Cannot delete the only remaining workspace.");
      return;
    }
    if (confirmName.trim().toLowerCase() !== activeOrg.name.trim().toLowerCase()) {
      setDeleteError(`Please type "${activeOrg.name}" exactly to confirm.`);
      return;
    }
    if (!onDeleteCompany) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteCompany(activeOrg.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete workspace";
      setDeleteError(msg);
      setDeleting(false);
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
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-neutral-900 dark:text-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              {activeOrg.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight">
                Workspace Settings
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {activeOrg.name} ({activeOrg.slug || "workspace"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center space-x-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>General & Branding</span>
          </button>

          {onDeleteCompany && (
            <button
              type="button"
              onClick={() => setActiveTab("danger")}
              className={`py-3 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "danger"
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          {/* TAB 1: General & Branding */}
          {activeTab === "general" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              {/* Workspace Name Input */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-xs"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Shown in your workspace header, sidebar, and invitation links.
                </p>
              </div>

              {/* Slug Preview */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Workspace URL
                </label>
                <div className="flex items-center text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 font-mono">
                  <span className="text-neutral-400">kaelixo.com/</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {activeOrg.slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "workspace"}
                  </span>
                </div>
              </div>

              {/* Logo Section */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Workspace Logo
                </label>

                <div className="grid grid-cols-[96px_1fr] gap-4 items-center">
                  {/* Logo Preview Box */}
                  <div className="w-24 h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                    {logoUrl && !imageError ? (
                      <img
                        src={logoUrl}
                        alt="Company Logo Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="font-extrabold text-2xl text-neutral-600 dark:text-neutral-300">
                        {name.charAt(0).toUpperCase() || "W"}
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
                      className="w-full py-2 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition text-center cursor-pointer shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? "Uploading..." : "Upload logo photo"}</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl("");
                          setImageError(false);
                        }}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer block"
                      >
                        Remove photo
                      </button>
                    )}
                    <p className="text-[11px] text-neutral-400">
                      Recommended: Square PNG, SVG or JPG (min 128x128px)
                    </p>
                  </div>
                </div>

                {/* Logo Presets */}
                <div className="mt-3">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold block mb-1.5">
                    Or select a preset logo:
                  </span>
                  <div className="flex items-center space-x-2">
                    {presetLogos.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setImageError(false);
                          setLogoUrl(preset);
                        }}
                        className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition cursor-pointer relative ${
                          logoUrl === preset
                            ? "border-indigo-600 ring-2 ring-indigo-500/40"
                            : "border-neutral-300 dark:border-neutral-700 hover:opacity-80"
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
                  className="px-4 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {saving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Danger Zone */}
          {activeTab === "danger" && onDeleteCompany && (
            <div className="space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
                  {deleteError}
                </div>
              )}

              {isSoleOrg ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Workspace Deletion Not Allowed</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                    <strong>{activeOrg.name}</strong> is currently your only active workspace. Kaelixo requires at least one workspace to be available. To delete this workspace, create or join another workspace first.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDelete} className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-4">
                  <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Permanently Delete Workspace</span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    This will permanently remove <strong>{activeOrg.name}</strong>, including all associated channels, messages, departments, and workspace files. This action cannot be reversed.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      To confirm, type <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">{activeOrg.name}</span> below:
                    </label>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={activeOrg.name}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("general")}
                      className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={
                        deleting ||
                        confirmName.trim().toLowerCase() !== activeOrg.name.trim().toLowerCase()
                      }
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deleting ? "Deleting..." : "Permanently Delete Workspace"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
