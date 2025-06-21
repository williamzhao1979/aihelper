"use client"

import { useTranslations } from "next-intl"
import MultiPlatformAIV2 from "@/components/MultiPlatformAIV2"
import DeviceSwitcher from "@/components/device-switcher"

export default function ChatMobilePage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 设备切换器 */}
      <div className="fixed top-4 right-4 z-50">
        <DeviceSwitcher currentDevice="mobile" />
      </div>

      {/* 手机版聊天界面 */}
      <MultiPlatformAIV2 currentVersion="v2" onVersionChange={() => {}} />
    </div>
  )
}
