"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { GoogleDriveClient } from '@/lib/google-drive-client'

export default function GoogleDriveCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const state = searchParams.get('state')

      if (error) {
        // 处理错误
        window.opener?.postMessage({
          type: 'google-drive-auth-error',
          error: error
        }, window.location.origin)
        window.close()
        return
      }

      if (!code) {
        window.opener?.postMessage({
          type: 'google-drive-auth-error',
          error: 'No authorization code received'
        }, window.location.origin)
        window.close()
        return
      }

      try {
        // 创建Google Drive客户端实例
        const config = {
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          redirectUri: `${window.location.origin}/google-drive-callback`,
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.profile'
          ]
        }

        const client = new GoogleDriveClient(config)
        
        // 使用授权码获取访问令牌
        const tokens = await client.getTokensFromCode(code)
        
        // 发送成功消息给父窗口
        window.opener?.postMessage({
          type: 'google-drive-auth-success',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: (tokens.expiresAt - Date.now()) / 1000
        }, window.location.origin)
        
        // 关闭认证窗口
        window.close()
      } catch (error) {
        console.error('Google Drive authentication error:', error)
        
        // 发送错误消息给父窗口
        window.opener?.postMessage({
          type: 'google-drive-auth-error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, window.location.origin)
        
        window.close()
      }
    }

    handleCallback()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在处理Google Drive认证...</p>
      </div>
    </div>
  )
} 