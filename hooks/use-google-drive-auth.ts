import { useCallback, useEffect, useState } from 'react'
import { GoogleDriveClient, GoogleDriveConfig } from '@/lib/google-drive-client'

const config: GoogleDriveConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/google-drive-callback` : '',
  scopes: [
    'https://www.googleapis.com/auth/drive.file',  // 仅访问应用创建的文件
    'https://www.googleapis.com/auth/userinfo.profile'  // 用户信息
  ]
}

export function useGoogleDriveAuth() {
  const [client, setClient] = useState<GoogleDriveClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ id: string; displayName: string; email: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const c = new GoogleDriveClient(config)
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
      console.error('Google Drive authentication error:', e)
      setError(e?.message || 'Google Drive认证失败')
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