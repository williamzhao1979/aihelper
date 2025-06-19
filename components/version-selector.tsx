"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Sparkles, Info, X } from "lucide-react"

interface VersionSelectorProps {
  currentVersion: "v1" | "v2"
  onVersionChange: (version: "v1" | "v2") => void
}

export default function VersionSelector({ currentVersion, onVersionChange }: VersionSelectorProps) {
  const [showInfo, setShowInfo] = useState(false)

  const handleToggle = (checked: boolean) => {
    onVersionChange(checked ? "v2" : "v1")
  }

  return (
    <div className="relative">
      {/* Version Toggle */}
      <div className="flex items-center gap-3 p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold transition-colors ${currentVersion === "v1" ? "text-blue-600" : "text-gray-400"}`}
          >
            经典版
          </span>
          <Switch
            checked={currentVersion === "v2"}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500"
          />
          <span
            className={`text-sm font-semibold transition-colors flex items-center gap-1 ${currentVersion === "v2" ? "text-purple-600" : "text-gray-400"}`}
          >
            <Star className="w-3 h-3" />
            增强版
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 h-6 w-6 hover:bg-gray-100"
        >
          <Info className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      {/* Version Info Panel */}
      {showInfo && (
        <Card className="absolute top-full mt-2 right-0 w-80 z-50 border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                版本对比
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfo(false)}
                className="p-1 h-6 w-6 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* V1 Features */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-semibold text-blue-700">经典版 v1</span>
                </div>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• 稳定可靠的核心功能</li>
                  <li>• 多平台AI同时回答</li>
                  <li>• 流式响应支持</li>
                  <li>• 经过验证的用户体验</li>
                </ul>
              </div>

              {/* V2 Features */}
              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <span className="font-semibold text-purple-700 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    增强版 v2
                  </span>
                </div>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>• 包含所有v1功能</li>
                  <li>• 优化的用户界面</li>
                  <li>• 更多功能入口</li>
                  <li>• 持续更新的新特性</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">💡 您可以随时切换版本，设置会自动保存</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
