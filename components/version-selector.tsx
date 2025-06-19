"use client"

import { Switch } from "@/components/ui/switch"
import { Star } from "lucide-react"

interface VersionSelectorProps {
  currentVersion: "v1" | "v2"
  onVersionChange: (version: "v1" | "v2") => void
}

export default function VersionSelector({ currentVersion, onVersionChange }: VersionSelectorProps) {
  const handleToggle = (checked: boolean) => {
    onVersionChange(checked ? "v2" : "v1")
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-medium transition-colors ${currentVersion === "v1" ? "text-blue-600" : "text-gray-400"}`}
        >
          经典版
        </span>
        <Switch
          checked={currentVersion === "v2"}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500"
        />
        <span
          className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentVersion === "v2" ? "text-purple-600" : "text-gray-400"}`}
        >
          <Star className="w-3 h-3" />
          增强版
        </span>
      </div>
    </div>
  )
}
