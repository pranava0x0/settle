"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type SquabbleTheme = "none" | "ring" | "molten" | "impact";

const THEMES: { id: SquabbleTheme; emoji: string; label: string }[] = [
  { id: "ring", emoji: "\uD83E\uDD4A", label: "The Ring" },
  { id: "molten", emoji: "\uD83C\uDF0B", label: "Molten" },
  { id: "impact", emoji: "\u2604\uFE0F", label: "Impact" },
];

const STORAGE_KEY = "squabble-theme";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<SquabbleTheme>("none");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as SquabbleTheme | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Remove all theme classes from the page wrapper
    const wrapper = document.getElementById("squabble-page");
    if (!wrapper) return;

    wrapper.classList.remove("theme-ring", "theme-molten", "theme-impact");
    if (theme !== "none") {
      wrapper.classList.add(`theme-${theme}`);
    }

    if (theme === "none") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className="mb-3 flex items-center justify-center gap-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(theme === t.id ? "none" : t.id)}
          className={cn(
            "rounded-full px-2 py-1 text-sm transition-all",
            theme === t.id
              ? "bg-foreground/10 ring-1 ring-foreground/20 scale-110"
              : "opacity-60 hover:opacity-100",
          )}
          title={t.label}
        >
          {t.emoji}
        </button>
      ))}
    </div>
  );
};
