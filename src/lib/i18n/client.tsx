"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Language } from "./index";
import { DEFAULT_LANG, LANGUAGES } from "./index";

interface LanguageContextType {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: DEFAULT_LANG,
  dir: "ltr",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(DEFAULT_LANG);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  useEffect(() => {
    const stored = localStorage.getItem("waf-lang") as Language | null;
    if (stored && LANGUAGES.find((l) => l.code === stored)) {
      setLangState(stored);
      setDir(LANGUAGES.find((l) => l.code === stored)!.dir);
      document.documentElement.dir = LANGUAGES.find((l) => l.code === stored)!.dir;
      document.documentElement.lang = stored;
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    const langInfo = LANGUAGES.find((l) => l.code === newLang)!;
    setDir(langInfo.dir);
    document.documentElement.dir = langInfo.dir;
    document.documentElement.lang = newLang;
    localStorage.setItem("waf-lang", newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { t, LANGUAGES } from "./index";
