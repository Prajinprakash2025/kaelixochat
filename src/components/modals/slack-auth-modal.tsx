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
  Briefcase,
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
}

export function SlackAuthModal({
  isOpen,
  onClose,
  departments,
  currentUser,
  organizations = [],
  initialInviteCode = "",
  onLoginSuccess,
}: SlackAuthModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "company" | "profile">("email");
  const [email, setEmail] = useState(currentUser.email || "");
  const [otp, setOtp] = useState("");
  const [authUid, setAuthUid] = useState<string | null>(null);

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

  // STEP 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setSuccessMsg("Development test mode: You can enter code 123456 to proceed.");
      } else {
        setSuccessMsg(`A 6-digit verification code has been sent to ${email}`);
      }
      setStep("otp");
    } catch (err: any) {
      setSuccessMsg("Verification code ready. Enter 123456 for instant testing.");
      setStep("otp");
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

      if (cleanOtp.length === 6) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: "email",
        });

        if (data?.user) {
          setAuthUid(data.user.id);
        }

        if (error && cleanOtp !== "123456") {
          setErrorMsg("Invalid or expired verification code. (Use 123456 for testing)");
          setLoading(false);
          return;
        }
      }

      if (initialInviteCode) {
        await verifyCode(initialInviteCode);
      }

      setStep("company");
    } catch (err: any) {
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
          .select("*")
          .single();

        if (data && !error) {
          setVerifiedOrg(data);
        } else {
          setVerifiedOrg({
            id: `org-${Date.now()}`,
            name: newCompanyName.trim(),
            slug,
            invite_code: generatedInviteCode,
            plan: "pro",
          });
        }
        setRole("owner");
        setStep("profile");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to create company workspace");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                Sign in to Kaelixo
              </h2>
              <p className="text-xs text-neutral-500">
                {step === "email" && "Enter your work email to continue"}
                {step === "otp" && "Enter the 6-digit verification code"}
                {step === "company" && "Join a workspace or create a new one"}
                {step === "profile" && "Set up your profile and role"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800/40 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: EMAIL */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
              >
                <span>{loading ? "Sending Code..." : "Send Verification Code"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick Switcher for team testing */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Quick Switch Accounts (Testing):
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Prajin Prakash", "management", "owner")}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-left transition border border-neutral-200 dark:border-neutral-700"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Prajin (Owner)
                    </p>
                    <p className="text-[10px] text-neutral-500">Management</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Arjun Dev", "dev", "manager")}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-left transition border border-neutral-200 dark:border-neutral-700"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Arjun (Tech Lead)
                    </p>
                    <p className="text-[10px] text-neutral-500">Development</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Aparna Sharma", "teaching", "member")}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-left transition border border-neutral-200 dark:border-neutral-700"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Aparna (Instructor)
                    </p>
                    <p className="text-[10px] text-neutral-500">Training</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("Sneha Patel", "telecalling", "member")}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-left transition border border-neutral-200 dark:border-neutral-700"
                  >
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Sneha (Sales)
                    </p>
                    <p className="text-[10px] text-neutral-500">Outreach</p>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-9 pr-3.5 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-400">
                  For testing or local preview, enter code <strong>123456</strong>.
                </p>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-1/3 py-2 px-3 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !otp.trim()}
                  className="w-2/3 py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: COMPANY JOIN / CREATE */}
          {step === "company" && (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              {/* Tab Switcher */}
              <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1">
                <button
                  type="button"
                  onClick={() => setCompanyMode("join")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    companyMode === "join"
                      ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  Join with Invite Code
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode("create")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    companyMode === "create"
                      ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  + Create Workspace
                </button>
              </div>

              {companyMode === "join" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono uppercase rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {verifyingInvite && (
                    <p className="text-xs text-neutral-400">Validating invite code...</p>
                  )}

                  {verifiedOrg && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
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
                    <p className="text-[11px] text-neutral-400">
                      Default workspace code: <code className="font-bold text-indigo-500">KAELIXO-938c7e</code>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
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
                      placeholder="e.g. Acme Corporation, Global Tech"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                      Workspace Slug
                    </label>
                    <input
                      type="text"
                      value={newCompanySlug}
                      onChange={(e) => setNewCompanySlug(e.target.value)}
                      placeholder="acme-corp"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || verifyingInvite}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Processing..." : "Continue to Profile"}
              </button>
            </form>
          )}

          {/* STEP 4: PROFILE SETUP */}
          {step === "profile" && (
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentCode)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
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
