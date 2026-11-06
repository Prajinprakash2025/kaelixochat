"use client";

import React, { useState, useRef, useId } from "react";
import { X, Camera, Upload, Trash2, User, Phone, Briefcase, FileText } from "lucide-react";
import { WorkspaceMember, Department } from "@/types";
import { uploadAvatar } from "@/utils/storage";

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkspaceMember;
  departments: Department[];
  onSaveProfile: (updatedData: Partial<WorkspaceMember>) => Promise<void> | void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  departments: _departments,
  onSaveProfile,
}: EditProfileModalProps) {
  const nameInputId = useId();
  const displayNameInputId = useId();
  const titleInputId = useId();
  const phoneInputId = useId();
  const statusEmojiInputId = useId();
  const statusTextInputId = useId();
  const bioInputId = useId();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || "");
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [title, setTitle] = useState(currentUser.title || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || "💬");
  const [statusText, setStatusText] = useState(currentUser.statusText || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [avatar, setAvatar] = useState(currentUser.avatar || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be less than 5MB.");
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Read as Data URL so image is permanent and portable across clients
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      name || currentUser.name
    )}`;
    setAvatar(defaultAvatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Full Name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAvatar = avatar || currentUser.avatar;

      // If user uploaded a new image file, upload to Supabase Storage for permanent CDN URL
      if (selectedFile) {
        try {
          const uploadedUrl = await uploadAvatar(selectedFile, currentUser.id);
          if (uploadedUrl) {
            finalAvatar = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn("Storage upload fallback to base64 data URL:", uploadErr);
          // finalAvatar remains the portable base64 data URL from reader.readAsDataURL
        }
      }

      await onSaveProfile({
        name: trimmedName,
        displayName: displayName.trim() || trimmedName.toLowerCase().replace(/\s+/g, "."),
        title: title.trim(),
        phone: phone.trim(),
        statusEmoji: statusEmoji.trim() || "💬",
        statusText: statusText.trim(),
        bio: bio.trim(),
        avatar: finalAvatar,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
              Edit Your Profile
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Update your photo, contact details, and status.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Profile Photo Section */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex items-center space-x-4">
            <div className="relative">
              <img
                src={
                  avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "User")}`
                }
                alt="Profile Preview"
                className="w-16 h-16 rounded-2xl object-cover bg-neutral-200 dark:bg-neutral-700 ring-2 ring-neutral-300 dark:ring-neutral-700"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 transition"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-300 dark:border-neutral-600 rounded-xl transition flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                Recommended: Square JPG, PNG, or WebP up to 5MB.
              </p>
            </div>
          </div>

          {/* Full Name & Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={nameInputId}
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id={nameInputId}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-10 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={displayNameInputId}
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Display Name
              </label>
              <input
                id={displayNameInputId}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. alex.morgan"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Job Title & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={titleInputId}
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Job Title / Role
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id={titleInputId}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full pl-10 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={phoneInputId}
                className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id={phoneInputId}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Status (Emoji + Text) */}
          <div>
            <label
              htmlFor={statusTextInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Current Status
            </label>
            <div className="flex items-center space-x-2">
              <input
                id={statusEmojiInputId}
                type="text"
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                maxLength={4}
                className="w-14 text-center py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                title="Status Emoji"
              />
              <input
                id={statusTextInputId}
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What are you working on? (e.g. In focus mode)"
                className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Bio / Summary */}
          <div>
            <label
              htmlFor={bioInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1"
            >
              About Me <span className="text-neutral-400 font-normal">(Bio)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <textarea
                id={bioInputId}
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a brief introduction with your colleagues..."
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
