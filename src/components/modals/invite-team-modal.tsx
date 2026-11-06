"use client";

import React, { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Building2,
  ShieldCheck,
  Send,
  ExternalLink,
} from "lucide-react";
import { Organization, WorkspaceMember } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface InviteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrg: Organization;
  currentUser: WorkspaceMember;
  onUpdateOrgInviteCode: (newCode: string) => void;
}

export function InviteTeamModal({
  isOpen,
  onClose,
  activeOrg,
  currentUser,
  onUpdateOrgInviteCode,
}: InviteTeamModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [notification, setNotification] = useState("");

  const supabase = createClient();

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://kaelixochat.vercel.app";
  const inviteCode = activeOrg.invite_code || "KAELIXO-HQ2026";
  const inviteUrl = `${origin}/?invite=${inviteCode}`;

  const isPrivileged =
    currentUser.role === "owner" ||
    currentUser.role === "admin" ||
    currentUser.role === "manager";

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setNotification("ഇൻവൈറ്റ് കോഡ് കോപ്പി ചെയ്തു!");
      setTimeout(() => {
        setCopiedCode(false);
        setNotification("");
      }, 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setNotification("ഇൻവൈറ്റ് ലിങ്ക് കോപ്പി ചെയ്തു!");
      setTimeout(() => {
        setCopiedLink(false);
        setNotification("");
      }, 2500);
    } catch {
      // fallback
    }
  };

  const handleRegenerateCode = async () => {
    if (!isPrivileged) return;
    setIsRegenerating(true);
    setNotification("");

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCode = `KAELIXO-${randomSuffix}`;

    try {
      // Update in Supabase organizations table
      const { error } = await supabase
        .from("organizations")
        .update({ invite_code: newCode })
        .eq("id", activeOrg.id);

      if (error) {
        console.warn("Failed to update invite code in Supabase:", error);
      }

      onUpdateOrgInviteCode(newCode);
      setNotification(`🎉 പുതിയ ഇൻവൈറ്റ് കോഡ് (${newCode}) സജ്ജമാക്കി!`);
      setTimeout(() => setNotification(""), 4000);
    } catch (err: any) {
      console.warn("Regenerate code error:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `ഹലോ! ${activeOrg.name} വർക്ക്‌സ്‌പേസിൽ ചേരാൻ ക്ഷണിക്കുന്നു.\n\n🔗 ലിങ്ക്: ${inviteUrl}\n🔑 ഇൻവൈറ്റ് കോഡ്: ${inviteCode}\n\nKaelixo Slack-ൽ ലോഗിൻ ചെയ്ത് കോഡ് നൽകുക!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                  ടീമിനെ ക്ഷണിക്കുക (Invite Team)
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {activeOrg.name}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                കമ്പനി അംഗങ്ങൾക്ക് ലിങ്കും കോഡും അയച്ച് വർക്ക്‌സ്‌പേസിൽ ചേർക്കുക
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {notification && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-2 animate-in fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Invite Code Section */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                കമ്പനി ഇൻവൈറ്റ് കോഡ് (Invite Code)
              </label>
              {isPrivileged && (
                <button
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                  className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  title="Generate a new secure code"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`}
                  />
                  <span>പുതിയ കോഡ് ഉണ്ടാക്കുക</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5">
              <span className="font-mono text-base font-bold text-neutral-900 dark:text-white tracking-wider">
                {inviteCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Shareable Invite Link Section */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              നേരിട്ടുള്ള ഇൻവൈറ്റ് ലിങ്ക് (Shareable Link)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300 font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              ഈ ലിങ്ക് ക്ലിക്ക് ചെയ്താൽ ഇൻവൈറ്റ് കോഡ് ഓട്ടോമാറ്റിക് ആയി ഫിൽ ചെയ്യപ്പെടും.
            </p>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 shadow-md shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp-ൽ ഷെയർ ചെയ്യുക</span>
            </button>
            <button
              onClick={() => {
                const subject = `${activeOrg.name} വർക്ക്‌സ്‌പേസിലേക്ക് ക്ഷണം`;
                const body = `ഹലോ,\n\nഞങ്ങളുടെ ${activeOrg.name} വർക്ക്‌സ്‌പേസിൽ ചേരാൻ ഈ ലിങ്ക് ഉപയോഗിക്കുക:\n${inviteUrl}\n\nഇൻവൈറ്റ് കോഡ്: ${inviteCode}\n\nനന്ദി!`;
                window.location.href = `mailto:?subject=${encodeURIComponent(
                  subject
                )}&body=${encodeURIComponent(body)}`;
              }}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition active:scale-95 border border-neutral-200 dark:border-neutral-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ഇമെയിൽ വഴി അയക്കുക</span>
            </button>
          </div>

          {/* Role Status Note */}
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-500" />
            <span>
              {isPrivileged ? (
                <>
                  നിങ്ങൾ <strong>{currentUser.role.toUpperCase()}</strong> ആയതിനാൽ
                  ഇൻവൈറ്റ് കോഡുകൾ മാറ്റാനും അംഗങ്ങളെ ചേർക്കാനും പൂർണ്ണ അധികാരമുണ്ട്.
                </>
              ) : (
                <>
                  കമ്പനി അഡ്മിൻമാർക്കും മാനേജർമാർക്കും മാത്രമേ പുതിയ കോഡ് നിർമ്മിക്കാൻ സാധിക്കൂ.
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
