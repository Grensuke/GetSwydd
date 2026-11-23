"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "getswydd.theme.v1";

let currentTheme: ThemeChoice = "system";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getSavedTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // LocalStorage unavailable
  }
  return "system";
}

export function applyTheme(choice: ThemeChoice) {
  currentTheme = choice;
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // LocalStorage unavailable
  }

  const root = document.documentElement;
  if (choice === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", choice);
  }

  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): ThemeChoice {
  return currentTheme;
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

export function useTheme() {
  const [mounted, setMounted] = useState(false);
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    currentTheme = getSavedTheme();
    queueMicrotask(() => setMounted(true));
    notify();

    // Listen to OS theme changes if on system
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getSavedTheme() === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // Listen to storage changes across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = getSavedTheme();
        applyTheme(next);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    theme: mounted ? theme : "system",
    setTheme: applyTheme,
    mounted,
  };
}
