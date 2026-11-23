/** Theme cycling: auto -> dark -> light, resolved explicitly on <html data-theme>. */

export type ThemeChoice = "auto" | "dark" | "light";

const KEY = "lpt.theme";
const ORDER: ThemeChoice[] = ["auto", "dark", "light"];

export function initTheme(): () => ThemeChoice {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const saved = (localStorage.getItem(KEY) as ThemeChoice) || "auto";
    document.documentElement.dataset.theme = saved === "auto" ? (media.matches ? "dark" : "light") : saved;
  };
  media.addEventListener("change", apply);
  apply();
  return () => {
    const current = (localStorage.getItem(KEY) as ThemeChoice) || "auto";
    return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
  };
}

export function cycleTheme(next: ThemeChoice): void {
  localStorage.setItem(KEY, next);
  const media = matchMedia("(prefers-color-scheme: dark)");
  document.documentElement.dataset.theme = next === "auto" ? (media.matches ? "dark" : "light") : next;
}
