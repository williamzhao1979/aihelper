import { NextRequest, NextResponse } from 'next/server'
import { EnvAuthService } from '@/lib/auth/env-auth-service'

const authService = new EnvAuthService()

export async function POST(request: NextRequest) {
  try {
    console.log('[Login API] 开始处理登录请求')
    
    const { username, password } = await request.json()
    console.log('[Login API] 接收到登录请求:', { username, password: password ? '***' : 'empty' })

    if (!username || !password) {
      console.log('[Login API] 用户名或密码为空')
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    const result = await authService.login(username, password)
    console.log('[Login API] 认证服务返回结果:', { 
      success: result.success, 
      hasUser: !!result.user,
      hasToken: !!result.token,
      tokenLength: result.token?.length,
      error: result.error 
    })

    if (!result.success) {
      console.log('[Login API] 登录失败:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    console.log('[Login API] 登录成功，准备设置cookie')

    // 创建响应对象
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        username: result.user!.username,
        email: result.user!.email,
        displayName: result.user!.displayName,
        role: result.user!.role
      }
    })

    console.log('[Login API] 创建响应对象成功')
    console.log('[Login API] Token信息:', {
      exists: !!result.token,
      length: result.token?.length,
      preview: result.token?.substring(0, 50) + '...'
    })

    // 使用简单的cookie设置方法
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 // 24小时
    })

    console.log('[Login API] Cookie设置完成')
    
    // 验证cookie是否在响应头中
    const setCookieHeader = response.headers.get('set-cookie')
    console.log('[Login API] Set-Cookie header:', setCookieHeader)

    return response
  } catch (error) {
    console.error('登录API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
} 