"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { OneDriveClient } from '@/lib/onedrive-client'

export default function OneDriveCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const state = searchParams.get('state')

      if (error) {
        // 处理错误
        window.opener?.postMessage({
          type: 'onedrive-auth-error',
          error: error
        }, window.location.origin)
        window.close()
        return
      }

      if (!code) {
        window.opener?.postMessage({
          type: 'onedrive-auth-error',
          error: 'No authorization code received'
        }, window.location.origin)
        window.close()
        return
      }

      try {
        // 创建OneDrive客户端实例
        const config = {
          clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '',
          redirectUri: `${window.location.origin}/onedrive-callback`,
          scopes: [
            'Files.ReadWrite',
            'Files.ReadWrite.All',
            'offline_access',
            'User.Read'
          ],
          // 根据应用注册类型选择租户类型
          // 'common': 支持组织账户和个人账户
          // 'consumers': 仅个人账户
          // 'organizations': 仅组织账户
          tenantType: process.env.NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE as 'common' | 'consumers' | 'organizations' || 'common'
        }

        const client = new OneDriveClient(config)
        
        // 使用授权码获取访问令牌
        const tokens = await client.getTokensFromCode(code)
        
        // 发送成功消息给父窗口
        window.opener?.postMessage({
          type: 'onedrive-auth-success',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: (tokens.expiresAt - Date.now()) / 1000
        }, window.location.origin)
        
        // 关闭认证窗口
        window.close()
      } catch (error) {
        console.error('OneDrive authentication error:', error)
        
        // 发送错误消息给父窗口
        window.opener?.postMessage({
          type: 'onedrive-auth-error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, window.location.origin)
        
        window.close()
      }
    }

    handleCallback()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在处理OneDrive认证...</p>
      </div>
    </div>
  )
} 