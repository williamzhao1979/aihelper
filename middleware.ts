import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { type NextRequest, NextResponse } from "next/server"

// 设备检测函数
function detectDevice(userAgent: string): "mobile" | "desktop" {
  const mobileRegex = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(userAgent) ? "mobile" : "desktop"
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get("user-agent") || ""

  // 检查是否需要认证 - 只对 /healthcalendar 路径进行认证
  if (pathname.includes('/healthcalendar') && process.env.AUTH_ENABLED === 'true') {
    console.log('[Middleware] 检测到 healthcalendar 路径:', pathname)
    console.log('[Middleware] AUTH_ENABLED:', process.env.AUTH_ENABLED)
    
    const token = request.cookies.get('auth-token')?.value
    console.log('[Middleware] 读取到的token:', token ? `${token.substring(0, 20)}...` : 'null')
    console.log('[Middleware] 所有cookies:', request.cookies.getAll().map(c => `${c.name}: ${c.value.substring(0, 10)}...`))
    
    const locale = pathname.split("/")[1] || 'zh'
    
    // 生成回调URL - 直接使用当前完整路径
    const callbackUrl = pathname
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    loginUrl.searchParams.set('callbackUrl', callbackUrl)
    
    console.log('[Middleware] callbackUrl:', callbackUrl)
    console.log('[Middleware] loginUrl:', loginUrl.toString())

    if (!token) {
      // 重定向到登录页面
      console.log('[Middleware] 未找到认证令牌，重定向到登录页面')
      return NextResponse.redirect(loginUrl)
    }

    // 验证令牌 - 使用API调用而不是直接验证JWT
    try {
      console.log('[Middleware] 开始验证token')
      
      // 创建验证请求
      const validateUrl = new URL('/api/auth/env-validate', request.url)
      const validateRequest = new Request(validateUrl, {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${token}`
        }
      })
      
      const validateResponse = await fetch(validateRequest)
      console.log('[Middleware] 验证响应状态:', validateResponse.status)
      
      if (!validateResponse.ok) {
        // 令牌无效，重定向到登录页面
        console.log('[Middleware] 令牌验证失败，重定向到登录页面')
        return NextResponse.redirect(loginUrl)
      }
      
      const validateData = await validateResponse.json()
      console.log('[Middleware] 令牌验证成功，用户:', validateData.user?.username)
      console.log('[Middleware] 允许访问路径:', pathname)
    } catch (error) {
      // 令牌验证失败，重定向到登录页面
      console.log('[Middleware] 令牌验证异常:', error)
      return NextResponse.redirect(loginUrl)
    }
  }

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
