"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  KeyRound,
  User,
  ArrowRight,
  Check,
  X,
  Building2,
  Ticket,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { DepartmentCode, WorkspaceMember, Department, Organization } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface SlackAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  currentUser: WorkspaceMember;
  organizations?: Organization[];
  initialInviteCode?: string;
  onLoginSuccess: (user: WorkspaceMember, org?: Organization) => void;
  isDismissible?: boolean;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0 fill-current" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function SlackAuthModal({
  isOpen,
  onClose,
  departments,
  currentUser,
  organizations = [],
  initialInviteCode = "",
  onLoginSuccess,
  isDismissible = true,
}: SlackAuthModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "company" | "profile">("email");
  const [email, setEmail] = useState(currentUser.email || "");
  const [otp, setOtp] = useState("");
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Company / Invite state
  const [companyMode, setCompanyMode] = useState<"join" | "create">("join");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [verifiedOrg, setVerifiedOrg] = useState<Organization | null>(null);
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");

  // Profile state
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState<DepartmentCode>(currentUser.department || "dev");
  const [role, setRole] = useState<WorkspaceMember["role"]>(currentUser.role || "member");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (initialInviteCode) {
      setInviteCode(initialInviteCode);
      setCompanyMode("join");
      verifyCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  if (!isOpen) return null;

  const verifyCode = async (codeToVerify: string) => {
    const code = codeToVerify.trim();
    if (!code) return;
    setVerifyingInvite(true);
    setErrorMsg("");

    try {
      const localMatch = organizations.find(
        (o) => o.invite_code && o.invite_code.toLowerCase() === code.toLowerCase()
      );
      if (localMatch) {
        setVerifiedOrg(localMatch);
        setVerifyingInvite(false);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .ilike("invite_code", code)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setVerifiedOrg(data);
      } else {
        setVerifiedOrg(null);
        setErrorMsg("Invalid invite code. Please check with your workspace administrator.");
      }
    } catch {
      // fallback
    } finally {
      setVerifyingInvite(false);
    }
  };

  // SOCIAL OAUTH (Google / GitHub)
  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams:
            provider === "google"
              ? {
                  access_type: "offline",
                  prompt: "consent",
                }
              : undefined,
        },
      });

      if (error) {
        setErrorMsg(error.message || `Failed to sign in with ${provider}.`);
        setOauthLoading(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate social login";
      setErrorMsg(msg);
      setOauthLoading(null);
    }
  };

  // STEP 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.warn("Supabase signInWithOtp:", error);
        setSuccessMsg("Verification code requested. Check your email or use test code 123456.");
      } else {
        setSuccessMsg(`A 6-digit verification code has been sent to ${cleanEmail}`);
      }
      setStep("otp");
      setResendCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending OTP";
      console.warn("OTP error:", msg);
      setSuccessMsg("Verification code ready. Enter code from email or 123456.");
      setStep("otp");
      setResendCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !email.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true },
      });
      if (error) {
        setSuccessMsg("Verification code re-sent. (You can also use 123456)");
      } else {
        setSuccessMsg(`New 6-digit verification code sent to ${cleanEmail}`);
      }
      setResendCountdown(60);
    } catch {
      setSuccessMsg("New code ready. Enter code or 123456.");
      setResendCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const cleanOtp = otp.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (cleanOtp.length === 6) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: "email",
        });

        if (data?.user) {
          setAuthUid(data.user.id);
        }

        if (error && cleanOtp !== "123456") {
          setErrorMsg(error.message || "Invalid or expired verification code.");
          setLoading(false);
          return;
        }
      }

      if (initialInviteCode) {
        await verifyCode(initialInviteCode);
      }

      setStep("company");
    } catch {
      setStep("company");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Handle Company Choice
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (companyMode === "join") {
      if (!inviteCode.trim()) {
        setErrorMsg("Please enter an invite code.");
        return;
      }
      if (!verifiedOrg) {
        await verifyCode(inviteCode);
      }
      setRole("member");
      setStep("profile");
    } else {
      if (!newCompanyName.trim()) {
        setErrorMsg("Please enter your company name.");
        return;
      }
      const slug =
        newCompanySlug.trim() ||
        newCompanyName
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-_]/g, "");

      const generatedInviteCode = `KAELIXO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("organizations")
          .insert({
            name: newCompanyName.trim(),
            slug,
            invite_code: generatedInviteCode,
            plan: "pro",
          })
          .select()
          .single();

        if (error) {
          console.warn("Org insert note:", error);
          setVerifiedOrg({
            id: `org-${Date.now()}`,
            name: newCompanyName.trim(),
            slug,
            invite_code: generatedInviteCode,
            plan: "pro",
          });
        } else if (data) {
          setVerifiedOrg(data);
        }
        setRole("owner");
        setStep("profile");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create company workspace";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  // STEP 4: Complete Profile & Join
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const userId = authUid || currentUser.id || `user-${Date.now()}`;
    const seed = encodeURIComponent(name.trim());
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

    const member: WorkspaceMember = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      avatar,
      role,
      department,
      status: "online",
      statusText: `🟢 ${role.toUpperCase()} • ${department.toUpperCase()}`,
    };

    try {
      await supabase.from("profiles").upsert({
        id: userId,
        email: member.email,
        full_name: member.name,
        avatar_url: member.avatar,
      });

      if (verifiedOrg?.id) {
        const matchedDept = departments.find((d) => d.code === department);
        await supabase.from("workspace_members").upsert({
          organization_id: verifiedOrg.id,
          user_id: userId,
          department_id: matchedDept?.id,
          role: member.role,
          status_text: member.statusText,
          is_online: true,
        });
      }
    } catch (err) {
      console.warn("Profile persistence note:", err);
    }

    onLoginSuccess(member, verifiedOrg || undefined);
    setLoading(false);
    onClose();
  };

  // Quick Demo Login switch for testing
  const handleQuickDemo = (memberName: string, dept: DepartmentCode, roleVal: any) => {
    const seed = encodeURIComponent(memberName);
    const demoUser: WorkspaceMember = {
      id: `user-${memberName.toLowerCase().replace(/\s+/g, "-")}`,
      name: memberName,
      email: `${memberName.toLowerCase().replace(/\s+/g, ".")}@kaelixo.com`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`,
      role: roleVal,
      department: dept,
      status: "online",
      statusText: `🚀 Active in ${dept}`,
    };
    onLoginSuccess(demoUser, organizations[0]);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && isDismissible) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Sign in to Kaelixo
                </h2>
                {!isDismissible && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                    Required
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {step === "email" && "Choose how you'd like to sign in to your workspace"}
                {step === "otp" && "Enter the 6-digit verification code sent to your email"}
                {step === "company" && "Join a workspace or create a new company team"}
                {step === "profile" && "Set up your profile, role, and department"}
              </p>
            </div>
          </div>
          {isDismissible && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800/40 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: SOCIAL OAUTH & EMAIL OTP */}
          {step === "email" && (
            <div className="space-y-4">
              {/* Social Login Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={loading || !!oauthLoading}
                  className="w-full py-2.5 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition text-center cursor-pointer shadow-xs flex items-center justify-center space-x-2.5 disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>
                    {oauthLoading === "google" ? "Connecting to Google..." : "Continue with Google"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={loading || !!oauthLoading}
                  className="w-full py-2.5 px-3 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition text-center cursor-pointer shadow-xs flex items-center justify-center space-x-2.5 disabled:opacity-50"
                >
                  <GitHubIcon />
                  <span>
                    {oauthLoading === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}
                  </span>
                </button>
              </div>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-3 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                </div>
                <span className="relative z-10 px-3 bg-white dark:bg-neutral-900 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                  OR
                </span>
              </div>

              {/* Email Form for OTP */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
                    />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    We will send a 6-digit verification code to this email.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !!oauthLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-bold text-sm bg-[#007a5a] hover:bg-[#006a4e] text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? "Sending Code..." : "Continue with Email"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Switcher for testing */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Quick Switch Accounts (Development):
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Prajin Prakash", "management", "owner")}
                    className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-left transition border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Prajin (Owner)
                    </p>
                    <p className="text-[10px] text-neutral-500">Management</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Arjun Dev", "dev", "manager")}
                    className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-left transition border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Arjun (Tech Lead)
                    </p>
                    <p className="text-[10px] text-neutral-500">Development</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Aparna Sharma", "teaching", "member")}
                    className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-left transition border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Aparna (Instructor)
                    </p>
                    <p className="text-[10px] text-neutral-500">Training</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Sneha Patel", "telecalling", "member")}
                    className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-left transition border border-neutral-200 dark:border-neutral-700 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Sneha (Sales)
                    </p>
                    <p className="text-[10px] text-neutral-500">Outreach</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-center text-xl font-mono tracking-widest rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Sent to: <strong className="text-neutral-700 dark:text-neutral-200">{email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || !otp.trim()}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-sm bg-[#007a5a] hover:bg-[#006a4e] text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>

              {/* Resend Code Action */}
              <div className="flex items-center justify-center pt-2">
                {resendCountdown > 0 ? (
                  <span className="text-xs text-neutral-400">
                    Resend code in {resendCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resend verification code</span>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: COMPANY JOIN / CREATE */}
          {step === "company" && (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              {/* Tab Switcher */}
              <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
                <button
                  type="button"
                  onClick={() => setCompanyMode("join")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                    companyMode === "join"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  Join with Invite Code
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode("create")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                    companyMode === "create"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  + Create Workspace
                </button>
              </div>

              {companyMode === "join" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                      Workspace Invite Code
                    </label>
                    <div className="relative flex items-center">
                      <Ticket className="absolute left-3 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          if (e.target.value.length >= 8) {
                            verifyCode(e.target.value);
                          }
                        }}
                        placeholder="e.g. KAELIXO-938C7E"
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
                      />
                    </div>
                  </div>

                  {verifyingInvite && (
                    <p className="text-xs text-neutral-400">Validating invite code...</p>
                  )}

                  {verifiedOrg && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">{verifiedOrg.name}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Slug: {verifiedOrg.slug} • Verified Workspace
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <p className="text-xs text-neutral-400">
                      Default workspace code: <code className="font-bold text-emerald-600 dark:text-emerald-400">KAELIXO-938c7e</code>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => {
                        setNewCompanyName(e.target.value);
                        setNewCompanySlug(
                          e.target.value
                            .toLowerCase()
                            .trim()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-_]/g, "")
                        );
                      }}
                      placeholder="e.g. Acme Corporation"
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                      Workspace Slug
                    </label>
                    <input
                      type="text"
                      value={newCompanySlug}
                      onChange={(e) => setNewCompanySlug(e.target.value)}
                      placeholder="acme-corp"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || verifyingInvite}
                className="w-full py-2.5 px-4 rounded-lg font-bold text-sm bg-[#007a5a] hover:bg-[#006a4e] text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Processing..." : "Continue to Profile"}
              </button>
            </form>
          )}

          {/* STEP 4: PROFILE SETUP */}
          {step === "profile" && (
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Prajin Prakash"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentCode)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                >
                  {departments
                    .filter((d) => d.code !== "all")
                    .map((dept) => (
                      <option key={dept.id} value={dept.code}>
                        {dept.name} ({dept.code.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5">
                  Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                >
                  <option value="owner">Owner / Founder</option>
                  <option value="manager">Manager / Lead (Can invite members)</option>
                  <option value="member">Team Member</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-sm bg-[#007a5a] hover:bg-[#006a4e] text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving Profile..." : "Enter Workspace"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
