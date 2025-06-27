"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Languages } from "lucide-react"

interface LanguageSelectorProps {
  selectedLanguage: "en" | "zh"
  onLanguageChange: (language: "en" | "zh") => void
  disabled?: boolean
}

export function LanguageSelector({ selectedLanguage, onLanguageChange, disabled = false }: LanguageSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Languages className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">选择语言:</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant={selectedLanguage === "en" ? "default" : "outline"}
          size="sm"
          onClick={() => onLanguageChange("en")}
          disabled={disabled}
          className="relative"
        >
          English
          {selectedLanguage === "en" && <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs">✓</Badge>}
        </Button>

        <Button
          variant={selectedLanguage === "zh" ? "default" : "outline"}
          size="sm"
          onClick={() => onLanguageChange("zh")}
          disabled={disabled}
          className="relative"
        >
          中文
          {selectedLanguage === "zh" && <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs">✓</Badge>}
        </Button>
      </div>
    </div>
  )
}
