// 服务端设备检测（用于中间件）
export function detectServerDevice(userAgent: string): "mobile" | "desktop" {
  const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(userAgent) ? "mobile" : "desktop"
}

// 客户端设备检测（用于组件）
export function detectClientDevice(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop"

  const userAgent = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const screenWidth = window.innerWidth

  // 综合判断：用户代理 + 屏幕宽度
  return isMobile || screenWidth < 768 ? "mobile" : "desktop"
}

// 获取设备信息
export function getDeviceInfo() {
  if (typeof window === "undefined") {
    return {
      device: "desktop" as const,
      screenWidth: 1920,
      screenHeight: 1080,
      userAgent: "",
    }
  }

  return {
    device: detectClientDevice(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
  }
}
