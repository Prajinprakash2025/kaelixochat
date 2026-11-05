"use client";

import React from "react";
import {
  Code2,
  Bug,
  GitPullRequest,
  GraduationCap,
  FileText,
  HelpCircle,
  PhoneCall,
  Target,
  UserCheck,
  Briefcase,
  Megaphone,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { DepartmentCode } from "@/types";

interface DepartmentToolbarProps {
  departmentCode?: DepartmentCode;
  onApplyTemplate: (templateContent: string) => void;
}

export function DepartmentToolbar({
  departmentCode = "all",
  onApplyTemplate,
}: DepartmentToolbarProps) {
  // Return different specialized actions based on department
  const renderActions = () => {
    switch (departmentCode) {
      case "dev":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "```typescript\n// Paste your code snippet here\nfunction handleUpdate() {\n  console.log('Testing...');\n}\n```"
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition border border-emerald-200/60 dark:border-emerald-800/40"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Snippet</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "🐛 **Bug Report:**\n- **Issue:** \n- **Steps to reproduce:** \n- **Expected result:** \n- **Severity:** High / Medium / Low"
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition border border-rose-200/60 dark:border-rose-800/40"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Bug Report</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "🚀 **PR Ready for Review:**\n- **PR Link:** \n- **Key changes:** \n- **Reviewers:** @arjun"
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition border border-indigo-200/60 dark:border-indigo-800/40"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>PR Review</span>
            </button>
          </>
        );

      case "teaching":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📢 **ക്ലാസ് അറിയിപ്പ് (Batch Announcement):**\n- **Batch:** \n- **Time:** \n- **Topic:** \n- **Meeting Link:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 transition border border-amber-200/60 dark:border-amber-800/40"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>ക്ലാസ് അറിയിപ്പ്</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📄 **പഠന സാമഗ്രികൾ (Notes & Slides):**\n- **Subject:** \n- **Chapter:** \n- **Attached file link:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 transition border border-sky-200/60 dark:border-sky-800/40"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Study Notes</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "❓ **Student Doubt Resolution:**\n- **Student Name:** \n- **Question:** \n- **Answer / Solution:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition border border-purple-200/60 dark:border-purple-800/40"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Doubt Thread</span>
            </button>
          </>
        );

      case "telecalling":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📞 **Daily Calling Report:**\n- **Caller Name:** \n- **Total Calls:** \n- **Connected:** \n- **Follow-ups:** \n- **Conversions:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition border border-rose-200/60 dark:border-rose-800/40"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Daily Call Report</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "🎉 **Lead Converted! (വിജയകരമായ അഡ്മിഷൻ):**\n- **Student / Client:** \n- **Course / Package:** \n- **Amount:** ₹\n- **Calling Agent:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition border border-emerald-200/60 dark:border-emerald-800/40"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Lead Conversion</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📝 **Follow-up Reminder:**\n- **Client:** \n- **Phone:** \n- **Call Time:** \n- **Notes:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 transition border border-blue-200/60 dark:border-blue-800/40"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Follow-up Note</span>
            </button>
          </>
        );

      case "management":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📢 **പ്രധാന അറിയിപ്പ് (Company Official Announcement):**\n\n📌 **വിഷയം:** \n\n📝 **വിശദാംശങ്ങൾ:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition border border-purple-200/60 dark:border-purple-800/40"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Company Broadcast</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📊 **Weekly Metric Review:**\n- **Dev Deployments:** \n- **Active Batches:** \n- **Total Sales/Leads:** \n- **Key Focus for Next Week:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition border border-indigo-200/60 dark:border-indigo-800/40"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Metric Sync</span>
            </button>
          </>
        );

      default:
        return (
          <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Kaelixo Smart Actions: പെട്ടെന്നുള്ള വർക്ക്‌ഫ്ലോ ടെംപ്ലേറ്റുകൾ ഉപയോഗിക്കാം</span>
          </div>
        );
    }
  };

  return (
    <div className="px-6 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800/60 flex items-center space-x-2 overflow-x-auto">
      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex-shrink-0">
        Quick Tools:
      </span>
      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
        {renderActions()}
      </div>
    </div>
  );
}
