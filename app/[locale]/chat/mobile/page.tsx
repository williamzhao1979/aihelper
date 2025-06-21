import type { Metadata } from "next"
import MultiPlatformAIV2 from "@/components/MultiPlatformAIV2"

export const metadata: Metadata = {
  title: "AI Chat - Mobile",
  description: "Multi-platform AI chat interface optimized for mobile",
}

export default function ChatMobilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Chat Mobile</h1>
          <p className="text-gray-600 text-sm">Mobile-optimized AI chat experience</p>
          <div className="mt-3 flex justify-center items-center gap-2 text-xs text-gray-500">
            <span>📱 Mobile Version</span>
            <span>•</span>
            <a href="?force=desktop" className="text-blue-600 hover:text-blue-800 underline">
              Switch to Desktop
            </a>
          </div>
        </div>
        <MultiPlatformAIV2 />
      </div>
    </div>
  )
}
