import { NextRequest, NextResponse } from 'next/server'
import { GoogleDriveClient } from '@/lib/google-drive-client'

export async function GET(request: NextRequest) {
  try {
    // 创建Google Drive客户端配置
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/google-drive-callback`,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    }
    
    // 创建Google Drive客户端
    const client = new GoogleDriveClient(config)
    
    // 检查认证状态
    const isAuthenticated = client.isAuthenticated()
    
    if (isAuthenticated) {
      try {
        // 尝试获取用户信息来验证令牌是否有效
        const userInfo = await client.getUserInfo()
        return NextResponse.json({
          isAuthenticated: true,
          user: userInfo
        })
      } catch (error) {
        // 如果获取用户信息失败，说明令牌可能已过期
        return NextResponse.json({
          isAuthenticated: false,
          error: '令牌已过期，需要重新认证'
        })
      }
    } else {
      return NextResponse.json({
        isAuthenticated: false,
        error: '未认证'
      })
    }
  } catch (error) {
    console.error('检查Google Drive认证状态失败:', error)
    return NextResponse.json(
      { error: `检查认证状态失败: ${error}` },
      { status: 500 }
    )
  }
} 