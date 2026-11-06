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
  Megaphone,
  BarChart3,
  Zap,
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
  const renderActions = () => {
    switch (departmentCode) {
      case "dev":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "```typescript\n// Paste code snippet here\nfunction handleRequest() {\n  return { success: true };\n}\n```"
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
                  "🐛 **Bug Report:**\n- **Issue Description:** \n- **Reproduction Steps:** \n- **Expected Outcome:** \n- **Severity:** High / Medium / Low"
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
                  "🚀 **PR Ready for Review:**\n- **Pull Request URL:** \n- **Summary of Changes:** \n- **Reviewers:** "
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
                  "📢 **Session Announcement:**\n- **Cohort / Batch:** \n- **Schedule:** \n- **Topic:** \n- **Meeting Link:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 transition border border-amber-200/60 dark:border-amber-800/40"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Session Brief</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📄 **Course Materials & Slides:**\n- **Subject:** \n- **Module:** \n- **Attached Link / Resource:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 transition border border-sky-200/60 dark:border-sky-800/40"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Course Materials</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "❓ **Doubt Resolution:**\n- **Member:** \n- **Question:** \n- **Resolution:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition border border-purple-200/60 dark:border-purple-800/40"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Q&A Thread</span>
            </button>
          </>
        );

      case "telecalling":
        return (
          <>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📞 **Daily Activity Report:**\n- **Representative:** \n- **Total Calls:** \n- **Connected:** \n- **Follow-ups Scheduled:** \n- **Conversions:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition border border-rose-200/60 dark:border-rose-800/40"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Daily Activity</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "🎉 **Deal Closed / Lead Converted:**\n- **Client / Company:** \n- **Tier / Package:** \n- **Contract Value:** $\n- **Account Exec:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition border border-emerald-200/60 dark:border-emerald-800/40"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Closed Deal</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📝 **Client Follow-Up:**\n- **Contact Person:** \n- **Organization:** \n- **Scheduled Time:** \n- **Agenda:** "
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
                  "📢 **Company Announcement:**\n\n📌 **Subject:** \n\n📝 **Executive Summary & Key Takeaways:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50 transition border border-purple-200/60 dark:border-purple-800/40"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Official Broadcast</span>
            </button>
            <button
              onClick={() =>
                onApplyTemplate(
                  "📊 **Weekly Metric Review:**\n- **Product Deployments:** \n- **Active Accounts:** \n- **Pipeline & Revenue:** \n- **Top Priorities Next Sprint:** "
                )
              }
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition border border-indigo-200/60 dark:border-indigo-800/40"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Metric Review</span>
            </button>
          </>
        );

      default:
        return (
          <div className="flex items-center space-x-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Productivity Templates: Select specialized actions to format your messages</span>
          </div>
        );
    }
  };

  return (
    <div className="px-4 md:px-6 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800/60 flex items-center space-x-2 overflow-x-auto no-scrollbar">
      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex-shrink-0">
        Templates:
      </span>
      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
        {renderActions()}
      </div>
    </div>
  );
}
