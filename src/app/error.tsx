"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Kaelixo Application Error Boundary caught:", error);
  }, [error]);

  const handleHardReset = () => {
    try {
      localStorage.removeItem("kaelixo_user");
      localStorage.removeItem("kaelixo_org");
      localStorage.removeItem("kaelixo_active_dm_recipient");
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
          <AlertCircle className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Workspace Session Refresh
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Your session changed or encountered an interruption. Click below to reload your workspace safely.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            onClick={handleHardReset}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
