"use client"

import { useTranslations } from "next-intl"
import MultiPlatformAIV3 from "@/components/MultiPlatformAIV3"
import DeviceSwitcher from "@/components/device-switcher"
import { Languages } from "lucide-react"
import LanguageSwitcher from "@/components/language-switcher"

export default function ChatDesktopPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-white">
      {/* 右上角固定容器 */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        {/* Language Selection */}
        <LanguageSwitcher />
        {/* 设备切换器 */}
        <DeviceSwitcher currentDevice="desktop" />
      </div>

      {/* 桌面版聊天界面 */}
      <MultiPlatformAIV3 currentVersion="v3" onVersionChange={() => {}} />
    </div>
  )
}
