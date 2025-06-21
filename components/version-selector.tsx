"use client"
import { Star, Rocket } from "lucide-react"

interface VersionSelectorProps {
  currentVersion: "v1" | "v2" | "v3"
  onVersionChange: (version: "v1" | "v2" | "v3") => void
}

export default function VersionSelector({ currentVersion, onVersionChange }: VersionSelectorProps) {
  const handleToggle = (checked: boolean) => {
    onVersionChange(checked ? "v2" : "v1")
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => onVersionChange("v1")}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
            currentVersion === "v1" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
          }`}
        >
          经典版
        </button>
        <button
          onClick={() => onVersionChange("v2")}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            currentVersion === "v2" ? "bg-purple-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Star className="w-3 h-3" />
          增强版
        </button>
        <button
          onClick={() => onVersionChange("v3")}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            currentVersion === "v3"
              ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Rocket className="w-3 h-3" />
          极速版
        </button>
      </div>
    </div>
  )
}
