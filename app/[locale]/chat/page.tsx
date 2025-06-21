"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { Loader2, Smartphone, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

// 客户端设备检测函数
function detectClientDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop"

  const userAgent = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const screenWidth = window.innerWidth

  console.log("Client device detection:", {
    userAgent,
    isMobile,
    screenWidth,
    result: isMobile || screenWidth < 768 ? "mobile" : "desktop",
  })

  // 综合判断：用户代理 + 屏幕宽度
  return isMobile || screenWidth < 768 ? "mobile" : "desktop"
}

export default function ChatPage() {
  const router = useRouter()
  const [detectedDevice, setDetectedDevice] = useState<"mobile" | "desktop" | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    // 检查 URL 参数中是否有强制设备类型
    const urlParams = new URLSearchParams(window.location.search)
    const forceParam = urlParams.get("force")

    let targetDevice: "mobile" | "desktop"

    if (forceParam === "mobile" || forceParam === "desktop") {
      targetDevice = forceParam
    } else {
      targetDevice = detectClientDevice()
    }

    setDetectedDevice(targetDevice)

    // 延迟重定向，让用户看到检测结果
    const timer = setTimeout(() => {
      router.replace(`/chat/${targetDevice}`)
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  const manualRedirect = (device: "mobile" | "desktop") => {
    setIsRedirecting(true)
    router.replace(`/chat/${device}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto p-6">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-blue-600" />

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Detecting Your Device</h2>

        {detectedDevice && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center justify-center gap-2 mb-2">
              {detectedDevice === "mobile" ? (
                <Smartphone className="h-5 w-5 text-blue-600" />
              ) : (
                <Monitor className="h-5 w-5 text-blue-600" />
              )}
              <span className="font-medium text-gray-900">
                {detectedDevice === "mobile" ? "Mobile Device" : "Desktop Device"}
              </span>
            </div>
            <p className="text-sm text-gray-600">Redirecting to {detectedDevice} version...</p>
          </div>
        )}

        <p className="text-gray-600 mb-6">We're preparing the optimal chat experience for your device</p>

        {/* 手动选择选项 */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => manualRedirect("desktop")}
            className="flex items-center gap-2"
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => manualRedirect("mobile")}
            className="flex items-center gap-2"
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </Button>
        </div>
      </div>
    </div>
  )
}
