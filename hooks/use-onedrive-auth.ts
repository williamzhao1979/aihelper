import { useCallback, useEffect, useState } from 'react'
import { OneDriveClient, OneDriveConfig } from '@/lib/onedrive-client'

const config: OneDriveConfig = {
  clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/onedrive-callback` : '',
  scopes: [
    'Files.ReadWrite',
    'Files.ReadWrite.All',
    'offline_access',
    'User.Read'
  ],
  // 根据应用注册类型选择租户类型
  // 'common': 支持组织账户和个人账户（推荐）
  // 'consumers': 仅个人账户
  // 'organizations': 仅组织账户
  tenantType: (process.env.NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE as 'common' | 'consumers' | 'organizations') || 'common'
}

export function useOneDriveAuth() {
  const [client, setClient] = useState<OneDriveClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ id: string; displayName: string; email: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const c = new OneDriveClient(config)
    c.loadTokens()
    setClient(c)
    setIsAuthenticated(c.isAuthenticated())
    if (c.isAuthenticated()) {
      c.getUserInfo().then(setUser).catch(() => setUser(null))
    }
  }, [])

  const connect = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)
    try {
      await client.authenticate()
      setIsAuthenticated(client.isAuthenticated())
      const userInfo = await client.getUserInfo()
      setUser(userInfo)
    } catch (e: any) {
      console.error('OneDrive authentication error:', e)
      setError(e?.message || 'OneDrive认证失败')
    } finally {
      setLoading(false)
    }
  }, [client])

  const disconnect = useCallback(() => {
    if (!client) return
    client.logout()
    setIsAuthenticated(false)
    setUser(null)
  }, [client])

  return {
    isAuthenticated,
    user,
    loading,
    error,
    connect,
    disconnect
  }
} 