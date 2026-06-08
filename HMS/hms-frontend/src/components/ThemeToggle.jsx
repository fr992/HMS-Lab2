import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="fixed bottom-4 right-4 z-150 inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/25 print:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:shadow-black/40 dark:hover:bg-slate-800 dark:hover:text-amber-200"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
