import { NextRequest, NextResponse } from 'next/server'
import { EnvAuthService } from '@/lib/auth/env-auth-service'

const authService = new EnvAuthService()

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const user = await authService.validateToken(token)

    if (!user) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions
      }
    })
  } catch (error) {
    console.error('验证API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
} 