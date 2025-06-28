"use client"

import { Button } from "@/components/ui/button"

interface LanguageSelectorProps {
  currentLanguage: "en" | "zh"
  onLanguageChange: (language: "en" | "zh") => void
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="flex justify-center gap-2">
      <Button
        onClick={() => onLanguageChange("en")}
        variant={currentLanguage === "en" ? "default" : "outline"}
        size="sm"
      >
        English
      </Button>
      <Button
        onClick={() => onLanguageChange("zh")}
        variant={currentLanguage === "zh" ? "default" : "outline"}
        size="sm"
      >
        中文
      </Button>
    </div>
  )
}
