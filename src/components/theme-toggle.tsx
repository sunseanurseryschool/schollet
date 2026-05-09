"use client";

import { useTheme } from "@/components/theme-provider";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import React from "react";

const themes = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1 h-8 w-[88px]" />
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className="relative flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200"
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <AnimatePresence>
            {theme === value && (
              <motion.span
                layoutId="theme-toggle-pill"
                className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border/50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            )}
          </AnimatePresence>
          <Icon
            className={`relative z-10 h-3.5 w-3.5 transition-colors duration-200 ${
              theme === value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
