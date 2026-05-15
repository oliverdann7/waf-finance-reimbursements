import en from "./en.json";
import tr from "./tr.json";
import fa from "./fa.json";

export type Language = "en" | "tr" | "fa";
export type TranslationMap = typeof en;

const translations: Record<Language, TranslationMap> = { en, tr, fa };

export function getTranslation(lang: Language): TranslationMap {
  return translations[lang] || en;
}

export function getNestedValue(obj: unknown, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (typeof acc !== "object" || acc === null || !(key in acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
  return typeof value === "string" ? value : path;
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key]?.toString() ?? `{${key}}`
  );
}

export function t(lang: Language, path: string, params?: Record<string, string | number>): string {
  const translation = getTranslation(lang);
  const value = getNestedValue(translation, path);
  if (!value || value === path) return path.split(".").pop() || path;
  return params ? interpolate(value, params) : value;
}

export const LANGUAGES: { code: Language; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "tr", label: "Turkish", native: "Türkçe", dir: "ltr" },
  { code: "fa", label: "Persian", native: "فارسی", dir: "rtl" },
];

export const DEFAULT_LANG: Language = "en";
