"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const activeTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    queueMicrotask(() => setTheme(activeTheme));
  }, []);

  const toggle = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("fog-fire-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      <b>{theme === "dark" ? "Light" : "Dark"}</b>
    </button>
  );
}
