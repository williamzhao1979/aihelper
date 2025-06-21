"use client"

import { useTranslations } from "next-intl"
import MultiPlatformAIV3 from "@/components/MultiPlatformAIV3"
import DeviceSwitcher from "@/components/device-switcher"
import LanguageSwitcher from "@/components/language-switcher"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import MultiPlatformAIV1 from "@/components/MultiPlatformAIV1"
import MultiPlatformAIV2 from "@/components/MultiPlatformAIV2"

export default function ChatDesktopPage() {
  const t = useTranslations()
  const [currentVersion, setCurrentVersion] = useState<"v1" | "v2" | "v3">("v3")

  const handleVersionChange = (version: "v1" | "v2" | "v3") => {
    setCurrentVersion(version)
  }

  const getVersionLabel = (version: "v1" | "v2" | "v3") => {
    switch (version) {
      case "v1":
        return "经典版"
      case "v2":
        return "增强版"
      case "v3":
        return "极速版"
      default:
        return "极速版"
    }
  }

  const renderAIComponent = () => {
    switch (currentVersion) {
      case "v1":
        return <MultiPlatformAIV1 currentVersion="v1" onVersionChange={handleVersionChange} />
      case "v2":
        return <MultiPlatformAIV2 currentVersion="v2" onVersionChange={handleVersionChange} />
      case "v3":
        return <MultiPlatformAIV3 currentVersion="v3" onVersionChange={handleVersionChange} />
      default:
        return <MultiPlatformAIV3 currentVersion="v3" onVersionChange={handleVersionChange} />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 右上角固定容器 */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        {/* Language Selection */}
        <LanguageSwitcher />
        {/* 设备切换器 */}
        <DeviceSwitcher currentDevice="desktop" />
        {/* 版本切换器 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {getVersionLabel(currentVersion)}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleVersionChange("v1")}>经典版</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleVersionChange("v2")}>增强版</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleVersionChange("v3")}>极速版</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 桌面版聊天界面 */}
      {renderAIComponent()}
    </div>
  )
}
