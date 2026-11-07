"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
} from "react";
import { ColorMode, FontFamily, SLACK_THEMES, SlackTheme } from "@/types/preferences";

interface PreferencesState {
  colorMode: ColorMode;
  resolvedMode: "light" | "dark";
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  themeId: string;
  setThemeId: (themeId: string) => void;
  currentTheme: SlackTheme;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  focusModeDark: boolean;
  setFocusModeDark: (enabled: boolean) => void;
  density: "spacious" | "compact";
  setDensity: (d: "spacious" | "compact") => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isPreferencesOpen: boolean;
  openPreferences: (tab?: string) => void;
  closePreferences: () => void;
  initialTab: string;
}

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [, startTransition] = useTransition();
  const [colorMode, setColorModeState] = useState<ColorMode>("dark");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("dark");
  const [themeId, setThemeIdState] = useState<string>("mint-chip");
  const [fontFamily, setFontFamilyState] = useState<FontFamily>("lato");
  const [focusModeDark, setFocusModeDarkState] = useState<boolean>(true);
  const [density, setDensityState] = useState<"spacious" | "compact">("spacious");
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("appearance");

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("kaelixo_color_mode") as ColorMode | null;
      if (savedMode && (savedMode === "light" || savedMode === "dark" || savedMode === "system")) {
        setColorModeState(savedMode);
      }

      const savedTheme = localStorage.getItem("kaelixo_theme_id");
      if (savedTheme && SLACK_THEMES.some((t) => t.id === savedTheme)) {
        setThemeIdState(savedTheme);
      }

      const savedFont = localStorage.getItem("kaelixo_font_family") as FontFamily | null;
      if (savedFont) {
        setFontFamilyState(savedFont);
      }

      const savedFocus = localStorage.getItem("kaelixo_focus_dark");
      if (savedFocus !== null) {
        setFocusModeDarkState(savedFocus === "true");
      }

      const savedDensity = localStorage.getItem("kaelixo_density") as "spacious" | "compact" | null;
      if (savedDensity) {
        setDensityState(savedDensity);
      }

      const savedSound = localStorage.getItem("kaelixo_sound");
      if (savedSound !== null) {
        setSoundEnabledState(savedSound === "true");
      }
    } catch {
      // Local storage unavailable
    }
  }, []);

  // Compute resolved mode based on OS preference if system
  useEffect(() => {
    const updateResolved = () => {
      let target: "light" | "dark" = "dark";
      if (colorMode === "system") {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        target = isSystemDark ? "dark" : "light";
      } else {
        target = colorMode;
      }
      setResolvedMode(target);

      const root = document.documentElement;
      if (target === "dark") {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
    };

    updateResolved();

    if (colorMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => updateResolved();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [colorMode]);

  // Apply theme attributes and CSS variables
  const currentTheme = SLACK_THEMES.find((t) => t.id === themeId) || SLACK_THEMES[0];

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-slack-theme", themeId);
    root.style.setProperty("--theme-accent", currentTheme.accentColor);
    root.style.setProperty(
      "--theme-header-tint",
      resolvedMode === "dark" ? currentTheme.headerTintDark : currentTheme.headerTintLight
    );
    root.style.setProperty("--theme-sidebar-active", currentTheme.accentColor);
  }, [themeId, currentTheme, resolvedMode]);

  // Apply font family
  useEffect(() => {
    const root = document.documentElement;
    let fontCss = "var(--font-geist-sans), Arial, sans-serif";
    if (fontFamily === "lato") {
      fontCss = "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    } else if (fontFamily === "inter") {
      fontCss = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    } else if (fontFamily === "system") {
      fontCss = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    }
    root.style.setProperty("--user-font", fontCss);
  }, [fontFamily]);

  // Setters with localStorage persistence
  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    try {
      localStorage.setItem("kaelixo_color_mode", mode);
    } catch {
      // storage unavailable
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    startTransition(() => {
      setColorModeState((prev) => {
        const next = prev === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("kaelixo_color_mode", next);
        } catch {}
        return next;
      });
    });
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try {
      localStorage.setItem("kaelixo_theme_id", id);
    } catch {}
  }, []);

  const setFontFamily = useCallback((font: FontFamily) => {
    setFontFamilyState(font);
    try {
      localStorage.setItem("kaelixo_font_family", font);
    } catch {}
  }, []);

  const setFocusModeDark = useCallback((enabled: boolean) => {
    setFocusModeDarkState(enabled);
    try {
      localStorage.setItem("kaelixo_focus_dark", String(enabled));
    } catch {}
  }, []);

  const setDensity = useCallback((d: "spacious" | "compact") => {
    setDensityState(d);
    try {
      localStorage.setItem("kaelixo_density", d);
    } catch {}
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("kaelixo_sound", String(enabled));
    } catch {}
  }, []);

  const openPreferences = useCallback((tab = "appearance") => {
    setInitialTab(tab);
    setIsPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  // Global Keyboard Shortcut: Ctrl+, or Cmd+, opens Preferences (Slack standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setIsPreferencesOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        colorMode,
        resolvedMode,
        setColorMode,
        toggleColorMode,
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
        isPreferencesOpen,
        openPreferences,
        closePreferences,
        initialTab,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return ctx;
}
