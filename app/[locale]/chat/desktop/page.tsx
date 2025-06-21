import type { Metadata } from "next"
import MultiPlatformAIV3 from "@/components/MultiPlatformAIV3"

export const metadata: Metadata = {
  title: "AI Chat - Desktop",
  description: "Multi-platform AI chat interface optimized for desktop",
}

export default function ChatDesktopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Chat Desktop</h1>
          <p className="text-gray-600">Optimized desktop experience for multi-platform AI conversations</p>
          <div className="mt-4 flex justify-center items-center gap-2 text-sm text-gray-500">
            <span>💻 Desktop Version</span>
            <span>•</span>
            <a href="?force=mobile" className="text-blue-600 hover:text-blue-800 underline">
              Switch to Mobile
            </a>
          </div>
        </div>
        <MultiPlatformAIV3 />
      </div>
    </div>
  )
}
