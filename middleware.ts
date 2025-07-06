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
  // 如果AUTH_ENABLED不存在，默认设置为true
  const authEnabled = process.env.AUTH_ENABLED !== 'false'
  
  if (pathname.includes('/healthcalendar') && authEnabled) {
    console.log('[Middleware] 检测到 healthcalendar 路径:', pathname)
    console.log('[Middleware] AUTH_ENABLED:', process.env.AUTH_ENABLED, '实际启用:', authEnabled)
    
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

    // 验证令牌 - 使用简单的token格式验证（兼容Edge Runtime）
    try {
      console.log('[Middleware] 开始验证token')
      
      // 简单的token验证：检查格式和基本有效性
      if (!token || token.length < 10) {
        console.log('[Middleware] Token格式无效')
        return NextResponse.redirect(loginUrl)
      }
      
      // 检查token是否是JWT格式（有三个部分用.分隔）
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        console.log('[Middleware] Token不是有效的JWT格式')
        return NextResponse.redirect(loginUrl)
      }
      
      try {
        // 尝试解码JWT payload（不验证签名，只检查格式和过期时间）
        const payload = JSON.parse(atob(tokenParts[1]))
        
        // 检查token是否过期
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          console.log('[Middleware] Token已过期')
          return NextResponse.redirect(loginUrl)
        }
        
        console.log('[Middleware] Token格式验证通过，用户:', payload.username || payload.sub)
        console.log('[Middleware] 允许访问路径:', pathname)
      } catch (decodeError) {
        console.log('[Middleware] Token解码失败:', decodeError)
        return NextResponse.redirect(loginUrl)
      }
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
