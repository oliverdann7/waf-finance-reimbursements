"use client";

import { useLanguage, LANGUAGES } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            className={`cursor-pointer ${lang === l.code ? "bg-primary/10 font-medium" : ""}`}
            onClick={() => setLang(l.code)}
          >
            <span className="mr-2">{l.native}</span>
            <span className="text-xs text-muted-foreground">({l.label})</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
