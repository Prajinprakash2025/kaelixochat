"use client";

import React, { useState } from "react";
import {
  X,
  Palette,
  Bell,
  Clock,
  Compass,
  Home,
  MessageSquare,
  Globe,
  Eye,
  CheckCircle2,
  Video,
  Link2,
  Lock,
  Sparkles,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Check,
  Share2,
  Volume2,
  Monitor,
  Mic,
} from "lucide-react";
import { usePreferences } from "@/context/preferences-context";
import { SLACK_THEMES, SlackTheme, FontFamily } from "@/types/preferences";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export function PreferencesModal({ isOpen, onClose, defaultTab = "appearance" }: PreferencesModalProps) {
  const {
    colorMode,
    setColorMode,
    themeId,
    setThemeId,
    currentTheme,
    fontFamily,
    setFontFamily,
    focusModeDark,
    setFocusModeDark,
    density,
    setDensity,
    soundEnabled,
    setSoundEnabled,
  } = usePreferences();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [themeSubTab, setThemeSubTab] = useState<"slack" | "custom">("slack");
  const [copiedShare, setCopiedShare] = useState(false);

  // Appearance Font selector
  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontFamily(e.target.value as FontFamily);
  };

  const handleShareTheme = () => {
    navigator.clipboard?.writeText(
      `Check out my Kaelixo theme "${currentTheme.name}" with accent ${currentTheme.accentColor}!`
    );
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (!isOpen) return null;

  const categories = [
    { id: "availability", label: "Availability", icon: Clock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "navigation", label: "Navigation", icon: Compass },
    { id: "home", label: "Home", icon: Home },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "messages_media", label: "Messages & media", icon: MessageSquare },
    { id: "language_region", label: "Language & region", icon: Globe },
    { id: "accessibility", label: "Accessibility", icon: Eye },
    { id: "mark_as_read", label: "Mark as read", icon: CheckCircle2 },
    { id: "audio_video", label: "Audio and video", icon: Video },
    { id: "connected_accounts", label: "Connected accounts", icon: Link2 },
    { id: "privacy_visibility", label: "Privacy and visibility", icon: Lock },
    { id: "kaelixo_ai", label: "Kaelixo AI", icon: Sparkles },
    { id: "advanced", label: "Advanced", icon: Sliders },
  ];

  const curatedThemes = SLACK_THEMES.filter((t) => t.category === "curated");
  const singleColourThemes = SLACK_THEMES.filter((t) => t.category === "single");
  const funThemes = SLACK_THEMES.filter((t) => t.category === "fun");
  const classicThemes = SLACK_THEMES.filter((t) => t.category === "classic");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[90vh] max-h-[720px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 flex-shrink-0">
          <h2 className="text-lg font-bold tracking-tight">Preferences</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Categories Sidebar + Right Content Pane */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Categories Pane */}
          <div className="w-52 sm:w-60 border-r border-neutral-200 dark:border-neutral-800 py-3 px-2 overflow-y-auto custom-scrollbar flex-shrink-0 bg-neutral-50/30 dark:bg-neutral-950/20">
            <nav className="space-y-0.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      isActive
                        ? "bg-indigo-600 dark:bg-indigo-600 text-white shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
            {/* ============================================================== */}
            {/* APPEARANCE TAB (Light/Dark Mode, Fonts, and Slack Themes)      */}
            {/* ============================================================== */}
            {activeTab === "appearance" && (
              <div className="space-y-8 max-w-2xl">
                {/* 1. Font Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Font
                  </label>
                  <div className="relative max-w-xs">
                    <select
                      value={fontFamily}
                      onChange={handleFontChange}
                      className="w-full appearance-none bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs transition"
                    >
                      <option value="lato">Lato (Default)</option>
                      <option value="inter">Inter</option>
                      <option value="geist">Geist Sans</option>
                      <option value="system">System default</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
                      <span className="text-xs">▼</span>
                    </div>
                  </div>
                </div>

                {/* 2. Colour mode (Light, Dark, System) */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Colour mode</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Choose if Kaelixo&apos;s appearance should be light or dark, or follow your computer&apos;s settings.
                    </p>
                  </div>

                  {/* Tri-state Mode Selector Buttons */}
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {/* Light Mode */}
                    <button
                      type="button"
                      onClick={() => setColorMode("light")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer text-center ${
                        colorMode === "light"
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Sun className="w-5 h-5 mb-1.5 text-amber-500" />
                      <span className="text-xs font-semibold">Light</span>
                    </button>

                    {/* Dark Mode */}
                    <button
                      type="button"
                      onClick={() => setColorMode("dark")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer text-center ${
                        colorMode === "dark"
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Moon className="w-5 h-5 mb-1.5 text-indigo-400" />
                      <span className="text-xs font-semibold">Dark</span>
                    </button>

                    {/* System Mode */}
                    <button
                      type="button"
                      onClick={() => setColorMode("system")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer text-center ${
                        colorMode === "system"
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Laptop className="w-5 h-5 mb-1.5 text-neutral-400" />
                      <span className="text-xs font-semibold">System</span>
                    </button>
                  </div>

                  {/* Always use dark mode when in focus mode */}
                  <label className="flex items-center space-x-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={focusModeDark}
                      onChange={(e) => setFocusModeDark(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Always use dark colour mode when in focus mode.
                    </span>
                  </label>
                </div>

                {/* 3. Slack Themes Sub-tabs and Swatches */}
                <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 border-b border-neutral-200 dark:border-neutral-800">
                      <button
                        onClick={() => setThemeSubTab("slack")}
                        className={`pb-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                          themeSubTab === "slack"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                        }`}
                      >
                        Slack themes
                      </button>
                      <button
                        onClick={() => setThemeSubTab("custom")}
                        className={`pb-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                          themeSubTab === "custom"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                        }`}
                      >
                        Custom theme
                      </button>
                    </div>

                    <button
                      onClick={handleShareTheme}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition cursor-pointer shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{copiedShare ? "Copied!" : "Share"}</span>
                    </button>
                  </div>

                  {themeSubTab === "slack" ? (
                    <div className="space-y-6 pt-2">
                      {/* Section 1: Curated Themes (Miles Davis) */}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">
                          Celebrate the music of Miles Davis
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {curatedThemes.map((theme) => (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isActive={themeId === theme.id}
                              onSelect={() => setThemeId(theme.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Single colour */}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">
                          Single colour
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {singleColourThemes.map((theme) => (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isActive={themeId === theme.id}
                              onSelect={() => setThemeId(theme.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Fun and new (Includes Mint Chip from screenshot!) */}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">
                          Fun and new
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {funThemes.map((theme) => (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isActive={themeId === theme.id}
                              onSelect={() => setThemeId(theme.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Section 4: Updated classics */}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">
                          Updated classics
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {classicThemes.map((theme) => (
                            <ThemeCard
                              key={theme.id}
                              theme={theme}
                              isActive={themeId === theme.id}
                              onSelect={() => setThemeId(theme.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Custom Theme Tab */
                    <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Custom Accent Color</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Choose your workspace highlight color or enter a brand hex code.
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={currentTheme.accentColor}
                          onChange={(e) => {
                            const root = document.documentElement;
                            root.style.setProperty("--theme-accent", e.target.value);
                            root.style.setProperty("--theme-sidebar-active", e.target.value);
                          }}
                          className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                        />
                        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {currentTheme.accentColor}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* NOTIFICATIONS TAB                                              */}
            {/* ============================================================== */}
            {activeTab === "notifications" && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Notify me about...</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Choose when you want to receive desktop and sound alerts.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { id: "all", label: "All new messages", desc: "Get pinged for every message in joined channels" },
                    { id: "mentions", label: "Direct messages, mentions & keywords", desc: "Recommended for high-traffic teams" },
                    { id: "nothing", label: "Nothing", desc: "Silence all notifications" },
                  ].map((item, idx) => (
                    <label
                      key={item.id}
                      className="flex items-start space-x-3 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950/60 cursor-pointer transition"
                    >
                      <input
                        type="radio"
                        name="notif_freq"
                        defaultChecked={idx === 1}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">{item.label}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Sound & Haptics</h4>
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Play a sound for incoming messages and alerts
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MESSAGES & MEDIA TAB                                           */}
            {/* ============================================================== */}
            {activeTab === "messages_media" && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Message Display Density</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Adjust how compact or spacious conversation feeds appear.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDensity("spacious")}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      density === "spacious"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    }`}
                  >
                    <div className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Clean & Spacious</div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Slack default layout with generous line spacing and prominent avatars.
                    </p>
                  </button>

                  <button
                    onClick={() => setDensity("compact")}
                    className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                      density === "compact"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                    }`}
                  >
                    <div className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Compact View</div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Fit more messages on screen with smaller avatars and dense line spacing.
                    </p>
                  </button>
                </div>

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Inline Media Previews</h4>
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Show images, videos, and PDF previews directly in the chat feed
                    </span>
                  </label>
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                      Autoplay video clips and audio voice notes when scrolled into view
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* KAELIXO AI TAB                                                 */}
            {/* ============================================================== */}
            {activeTab === "kaelixo_ai" && (
              <div className="space-y-6 max-w-xl">
                <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-900/50">
                  <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">Kaelixo AI Assistant</h3>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Intelligent thread summaries, context-aware smart replies, and productivity templates.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white">One-click Thread Summaries</div>
                      <div className="text-[11px] text-neutral-500">
                        Generate instant bullet summaries for long discussion threads.
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white">Smart Reply Suggestions</div>
                      <div className="text-[11px] text-neutral-500">
                        Suggest quick responses based on recent messages.
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
                  </label>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* OTHER TABS (Fallback Clean UI)                                 */}
            {/* ============================================================== */}
            {activeTab !== "appearance" &&
              activeTab !== "notifications" &&
              activeTab !== "messages_media" &&
              activeTab !== "kaelixo_ai" && (
                <div className="space-y-4 max-w-md py-6">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white capitalize">
                    {categories.find((c) => c.id === activeTab)?.label}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Configuration options for {categories.find((c) => c.id === activeTab)?.label} are active and synced to your Kaelixo account.
                  </p>
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                    ✓ All defaults optimized for enterprise team collaboration.
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Swatch Card for Themes
function ThemeCard({
  theme,
  isActive,
  onSelect,
}: {
  theme: SlackTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center space-x-3 p-2.5 rounded-2xl border transition cursor-pointer text-left ${
        isActive
          ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20"
          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-950"
      }`}
    >
      {/* Circle color/gradient swatch */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs ring-1 ring-black/10 dark:ring-white/10 ${theme.previewGradient}`}
      >
        {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
      </div>

      <div className="truncate">
        <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate block">
          {theme.name}
        </span>
      </div>
    </button>
  );
}
