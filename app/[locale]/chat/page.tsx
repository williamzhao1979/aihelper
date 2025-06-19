"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import MultiPlatformAIV1 from "@/components/multi-platform-ai-v1"
import MultiPlatformAIV2 from "@/components/multi-platform-ai-v2"
import VersionSelector from "@/components/version-selector"
import { useVersion } from "@/hooks/use-version"

function ChatPageContent() {
  const { version, switchVersion, isLoading } = useVersion()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Version Selector - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <VersionSelector currentVersion={version} onVersionChange={switchVersion} />
      </div>

      {/* Render appropriate version */}
      {version === "v1" ? <MultiPlatformAIV1 /> : <MultiPlatformAIV2 />}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
