"use client";

import React, { useState, useRef, useId } from "react";
import { X, Mic, MicOff, Check } from "lucide-react";
import { WorkspaceMember, Department } from "@/types";
import { uploadAvatar } from "@/utils/storage";

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkspaceMember;
  departments: Department[];
  onSaveProfile: (updatedData: Partial<WorkspaceMember>) => Promise<void> | void;
  companyName?: string;
}

const COMMON_TIMEZONES = [
  { value: "Asia/Kolkata", label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi" },
  { value: "UTC", label: "(UTC+00:00) UTC" },
  { value: "Europe/London", label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London" },
  { value: "Europe/Paris", label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Abu Dhabi, Muscat, Dubai" },
  { value: "Asia/Singapore", label: "(UTC+08:00) Beijing, Perth, Singapore, Hong Kong" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Osaka, Sapporo, Tokyo" },
  { value: "America/New_York", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "America/Denver", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time (US & Canada)" },
];

export function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  departments: _departments,
  onSaveProfile,
  companyName = "Kaelixo",
}: EditProfileModalProps) {
  const nameInputId = useId();
  const displayNameInputId = useId();
  const titleInputId = useId();
  const pronunciationInputId = useId();
  const timezoneInputId = useId();
  const phoneInputId = useId();
  const bioInputId = useId();
  const statusInputId = useId();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || "");
  const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.name?.toLowerCase().replace(/\s+/g, "") || "");
  const [title, setTitle] = useState(currentUser.title || "");
  const [pronunciation, setPronunciation] = useState(currentUser.displayName || currentUser.name || "");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [statusText, setStatusText] = useState(currentUser.statusText || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [avatar, setAvatar] = useState(currentUser.avatar || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || "");
      setDisplayName(currentUser.displayName || currentUser.name?.toLowerCase().replace(/\s+/g, "") || "");
      setTitle(currentUser.title || "");
      setPronunciation(currentUser.displayName || currentUser.name || "");
      setPhone(currentUser.phone || "");
      setStatusText(currentUser.statusText || "");
      setBio(currentUser.bio || "");
      setAvatar(currentUser.avatar || "");
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen, currentUser]);

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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setHasRecording(true);
      }, 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Full name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAvatar = avatar || currentUser.avatar;

      if (selectedFile) {
        try {
          const uploadedUrl = await uploadAvatar(selectedFile, currentUser.id);
          if (uploadedUrl) {
            finalAvatar = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn("Storage upload fallback to base64 data URL:", uploadErr);
        }
      }

      await onSaveProfile({
        name: trimmedName,
        displayName: displayName.trim() || trimmedName.toLowerCase().replace(/\s+/g, ""),
        title: title.trim(),
        phone: phone.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-xl text-neutral-900 dark:text-neutral-100 tracking-tight">
              Edit Your Profile
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Update your photo, contact details, and status
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6 items-start">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              {/* Full name */}
              <div>
                <label
                  htmlFor={nameInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prajin Prakash"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>

              {/* Display name */}
              <div>
                <label
                  htmlFor={displayNameInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Display Name
                </label>
                <input
                  id={displayNameInputId}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. prajin"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  This could be your first name or a nickname — the name you&apos;d like people to use to refer to you in Slack.
                </p>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor={titleInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Job Title / Role
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. developer"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Let people know what you do at {companyName}.
                </p>
              </div>

              {/* Current Status */}
              <div>
                <label
                  htmlFor={statusInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Current Status
                </label>
                <input
                  id={statusInputId}
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. Working remotely, In a meeting"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>

              {/* Name recording */}
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Name recording
                </label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                    isRecording
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse"
                      : hasRecording
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                      : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Recording... (click to stop)</span>
                    </>
                  ) : hasRecording ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Audio clip recorded (click to re-record)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Record audio clip</span>
                    </>
                  )}
                </button>
              </div>

              {/* Name pronunciation */}
              <div>
                <label
                  htmlFor={pronunciationInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Name pronunciation
                </label>
                <input
                  id={pronunciationInputId}
                  type="text"
                  value={pronunciation}
                  onChange={(e) => setPronunciation(e.target.value)}
                  placeholder="e.g. prah-jin"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  This could be a phonetic pronunciation, or an example of something that your name sounds like.
                </p>
              </div>

              {/* Time zone */}
              <div>
                <label
                  htmlFor={timezoneInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Time zone
                </label>
                <select
                  id={timezoneInputId}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Your current time zone. Used to send summary and notification emails, for times in your activity feeds, and for reminders.
                </p>
              </div>

              {/* Phone number */}
              <div>
                <label
                  htmlFor={phoneInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id={phoneInputId}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>

              {/* About Me (Bio) */}
              <div>
                <label
                  htmlFor={bioInputId}
                  className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5"
                >
                  About Me (Bio)
                </label>
                <textarea
                  id={bioInputId}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a little bit about yourself, what you work on, or what you enjoy..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition resize-none"
                />
              </div>
            </div>

            {/* Right Column: Profile Photo Section */}
            <div className="flex flex-col items-start w-full">
              <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                Profile photo
              </label>

              <div className="w-full aspect-square max-w-[180px] rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 mb-3 shadow-xs">
                <img
                  src={
                    avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "User")}`
                  }
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition text-center cursor-pointer shadow-xs"
              >
                Upload Image
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="w-full text-center text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer mt-2.5 transition"
              >
                Remove photo
              </button>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="mt-8 pt-4 flex items-center justify-end space-x-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-[#007a5a] hover:bg-[#006a4e] rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
