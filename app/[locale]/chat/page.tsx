"use client"

import { useState } from "react"
import MultiPlatformAIV1 from "@/components/MultiPlatformAIV1"
import MultiPlatformAIV2 from "@/components/MultiPlatformAIV2"
import MultiPlatformAIV3 from "@/components/MultiPlatformAIV3"

export default function ChatPage() {
  const [version, setVersion] = useState<"v1" | "v2" | "v3">("v3")

  return (
    <div className="flex flex-col h-screen">
      {version === "v3" ? (
        <MultiPlatformAIV3 currentVersion={version} onVersionChange={setVersion} />
      ) : version === "v2" ? (
        <MultiPlatformAIV2 currentVersion={version} onVersionChange={setVersion} />
      ) : (
        <MultiPlatformAIV1 />
      )}
    </div>
  )
}
