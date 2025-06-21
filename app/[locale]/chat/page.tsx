"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// 客户端设备检测函数
function detectClientDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop"

  const userAgent = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const screenWidth = window.innerWidth

  // 综合判断：用户代理 + 屏幕宽度
  return isMobile || screenWidth < 768 ? "mobile" : "desktop"
}

export default function ChatPage() {
  const router = useRouter()

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

    // 重定向到对应的设备版本
    router.replace(`/chat/${targetDevice}`)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Detecting Device...</h2>
        <p className="text-gray-600">Redirecting to the optimal chat experience</p>
      </div>
    </div>
  )
}
