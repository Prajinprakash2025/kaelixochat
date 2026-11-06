"use client";

import React, { useState, useId } from "react";
import { X, UserPlus, Mail, User, Shield, Building, AlertCircle } from "lucide-react";
import { WorkspaceMember, Department, DepartmentCode } from "@/types";
import { isWorkspaceOwner, isDepartmentHead, getAddMemberDepartmentScope } from "@/utils/permissions";

export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkspaceMember;
  departments: Department[];
  existingEmails: string[];
  onAddMember: (data: {
    email: string;
    name?: string;
    department: DepartmentCode;
    role: "Member" | "Manager";
  }) => Promise<void> | void;
}

export function AddMemberModal({
  isOpen,
  onClose,
  currentUser,
  departments,
  existingEmails,
  onAddMember,
}: AddMemberModalProps) {
  const emailInputId = useId();
  const nameInputId = useId();
  const deptInputId = useId();
  const roleInputId = useId();

  const { allowedDepartments, isLocked, defaultDepartment } = getAddMemberDepartmentScope(
    currentUser,
    departments
  );

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<DepartmentCode>(defaultDepartment);
  const [role, setRole] = useState<"Member" | "Manager">("Member");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isOwner = isWorkspaceOwner(currentUser);
  const isManager = isDepartmentHead(currentUser);

  // Derive human name from email (e.g., alex.smith@domain.com -> Alex Smith)
  const deriveNameFromEmail = (rawEmail: string): string => {
    const prefix = rawEmail.split("@")[0] || "";
    return prefix
      .replace(/[._-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError("Please enter a valid work email address.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("The email address format is invalid. Please check and try again.");
      return;
    }

    // Duplicate check
    const isDuplicate = existingEmails.some(
      (e) => e.trim().toLowerCase() === trimmedEmail
    );
    if (isDuplicate) {
      setError("A team member with this email address already exists in the workspace.");
      return;
    }

    const finalName = name.trim() || deriveNameFromEmail(trimmedEmail) || "New Member";
    const finalDept = isLocked ? defaultDepartment : department;
    const finalRole: "Member" | "Manager" = isOwner ? role : "Member";

    setIsSubmitting(true);
    try {
      await onAddMember({
        email: trimmedEmail,
        name: finalName,
        department: finalDept,
        role: finalRole,
      });
      // Reset form
      setEmail("");
      setName("");
      setDepartment(defaultDepartment);
      setRole("Member");
      setError(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Add Team Member
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Invite a colleague to join your workspace and department.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label
              htmlFor={emailInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Work Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id={emailInputId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor={nameInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Full Name <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id={nameInputId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              If left blank, will automatically be generated from the email username.
            </p>
          </div>

          {/* Department Selection */}
          <div>
            <label
              htmlFor={deptInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Assigned Department <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                id={deptInputId}
                disabled={isLocked}
                value={isLocked ? defaultDepartment : department}
                onChange={(e) => setDepartment(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  isLocked ? "opacity-75 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
              >
                {allowedDepartments.map((dept) => (
                  <option key={dept.id} value={dept.code}>
                    {dept.name} ({dept.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            {isLocked && isManager && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1">
                <span>Locked to your department ({currentUser.department.toUpperCase()}).</span>
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label
              htmlFor={roleInputId}
              className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Workspace Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                id={roleInputId}
                disabled={!isOwner}
                value={isOwner ? role : "Member"}
                onChange={(e) => setRole(e.target.value as "Member" | "Manager")}
                className={`w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  !isOwner ? "opacity-75 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
              >
                <option value="Member">Member (Standard staff access)</option>
                {isOwner && <option value="Manager">Manager (Department administrator)</option>}
              </select>
            </div>
            {!isOwner && (
              <p className="text-[11px] text-neutral-400 mt-1">
                Department Managers can only add Members. Contact a Workspace Owner for managerial promotions.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-neutral-200 dark:border-neutral-800">
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
