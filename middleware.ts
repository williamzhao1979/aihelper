import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { type NextRequest, NextResponse } from "next/server"

// 设备检测函数
function detectDevice(userAgent: string): "mobile" | "desktop" {
  const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(userAgent) ? "mobile" : "desktop"
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get("user-agent") || ""

  // 处理 chat 路由的设备检测和重定向
  if (pathname.includes("/chat") && !pathname.includes("/chat/desktop") && !pathname.includes("/chat/mobile")) {
    const device = detectDevice(userAgent)
    const locale = pathname.split("/")[1] // 获取语言前缀

    // 检查是否有强制参数
    const forceParam = request.nextUrl.searchParams.get("force")
    const targetDevice = forceParam === "desktop" || forceParam === "mobile" ? forceParam : device

    const newPath = `/${locale}/chat/${targetDevice}`
    return NextResponse.redirect(new URL(newPath, request.url))
  }

  // 继续执行国际化中间件
  return createMiddleware(routing)(request)
}

export const config = {
  // 匹配所有国际化路径和 chat 路径
  matcher: ["/", "/(zh|en|ja)/:path*"],
}
