"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type SquabbleTheme = "none" | "ring" | "molten" | "impact";

const THEMES: {
  id: SquabbleTheme;
  emoji: string;
  label: string;
  gradient: string;
  activeRing: string;
}[] = [
  {
    id: "ring",
    emoji: "\uD83E\uDD4A",
    label: "The Ring",
    gradient: "bg-gradient-to-r from-red-500 via-yellow-400 to-blue-600",
    activeRing: "ring-red-400/60",
  },
  {
    id: "molten",
    emoji: "\uD83C\uDF0B",
    label: "Molten",
    gradient: "bg-gradient-to-r from-orange-600 via-red-500 to-yellow-500",
    activeRing: "ring-orange-400/60",
  },
  {
    id: "impact",
    emoji: "\u2604\uFE0F",
    label: "Impact",
    gradient: "bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-500",
    activeRing: "ring-cyan-400/60",
  },
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
    <div className="flex items-center gap-1">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(isActive ? "none" : t.id)}
            className={cn(
              "relative size-7 rounded-full transition-all duration-200",
              isActive
                ? `ring-2 ${t.activeRing} scale-110 shadow-md`
                : "opacity-50 hover:opacity-90 hover:scale-105",
            )}
            title={t.label}
          >
            <span
              className={cn(
                "absolute inset-0.5 rounded-full",
                t.gradient,
              )}
            />
            <span className="relative z-10 flex items-center justify-center text-xs leading-none">
              {t.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
};
