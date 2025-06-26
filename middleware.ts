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

  // 精确匹配 chat 路由，避免匹配到 chat/desktop 或 chat/mobile
  const chatRouteRegex = /^\/(zh|en|ja)\/chat$/

  if (chatRouteRegex.test(pathname)) {
    const device = detectDevice(userAgent)
    const locale = pathname.split("/")[1] // 获取语言前缀

    // 检查是否有强制参数
    const forceParam = request.nextUrl.searchParams.get("force")
    const targetDevice = forceParam === "desktop" || forceParam === "mobile" ? forceParam : device

    console.log(`Device detected: ${device}, Target: ${targetDevice}, UserAgent: ${userAgent}`)

    const newPath = `/${locale}/chat/${targetDevice}`
    const newUrl = new URL(newPath, request.url)

    // 保留查询参数
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "force") {
        newUrl.searchParams.set(key, value)
      }
    })

    return NextResponse.redirect(newUrl)
  }

  // 继续执行国际化中间件
  return createMiddleware(routing)(request)
}

export const config = {
  // 更精确的匹配模式，排除 /cowsay
  matcher: [
    "/",
    "/(zh|en|ja)/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.[a-z]+$).*)",
  ],
}
