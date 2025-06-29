'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useGoogleDriveAuth } from '@/hooks/use-google-drive-auth'
import { Cloud, TestTube, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { GoogleDriveClientSync } from '@/lib/google-drive-client-sync'

export default function GoogleDriveAuthTestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, user, connect, disconnect } = useGoogleDriveAuth()
  const [authTokens, setAuthTokens] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 获取认证令牌
  const getAuthTokens = () => {
    if (typeof window === 'undefined') return null
    
    try {
      const tokens = localStorage.getItem('google-drive-tokens')
      if (tokens) {
        const parsedTokens = JSON.parse(tokens)
        setAuthTokens(parsedTokens)
        return parsedTokens
      }
    } catch (error) {
      console.error('获取认证令牌失败:', error)
    }
    
    return null
  }

  // 测试认证状态API
  const testAuthStatusAPI = async () => {
    try {
      const response = await fetch('/api/google-drive/auth-status')
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        name: '认证状态API测试',
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }])
      
      if (response.ok) {
        toast({
          title: '认证状态API测试成功',
          description: `认证状态: ${result.isAuthenticated ? '已认证' : '未认证'}`,
        })
      } else {
        toast({
          title: '认证状态API测试失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: '认证状态API测试',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: '认证状态API测试失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 测试同步API
  const testSyncAPI = async () => {
    try {
      const tokens = getAuthTokens()
      if (!tokens) {
        toast({
          title: '测试失败',
          description: '未找到认证令牌',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/google-drive/sync-with-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'status',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toString()
        })
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        name: '同步API测试',
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }])
      
      if (response.ok) {
        toast({
          title: '同步API测试成功',
          description: 'API调用成功',
        })
      } else {
        toast({
          title: '同步API测试失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: '同步API测试',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: '同步API测试失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 测试文件上传
  const testFileUpload = async () => {
    try {
      const tokens = getAuthTokens()
      if (!tokens) {
        toast({
          title: '测试失败',
          description: '未找到认证令牌',
          variant: 'destructive'
        })
        return
      }

      const testContent = JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: '这是一个测试文件'
      }, null, 2)

      const response = await fetch('/api/google-drive/test-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toString(),
          fileName: 'test-upload.json',
          content: testContent
        })
      })
      
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        name: '文件上传测试',
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }])
      
      if (response.ok) {
        toast({
          title: '文件上传测试成功',
          description: '文件上传成功',
        })
      } else {
        toast({
          title: '文件上传测试失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: '文件上传测试',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: '文件上传测试失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 测试同步
  const testSync = async () => {
    try {
      const result = await GoogleDriveClientSync.testSync()
      
      setTestResults(prev => [...prev, {
        name: '测试同步',
        success: result.success,
        result,
        timestamp: new Date().toISOString()
      }])
      
      if (result.success) {
        toast({
          title: '测试同步成功',
          description: `已同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
      } else {
        toast({
          title: '测试同步失败',
          description: result.errors.join(', '),
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: '测试同步',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: '测试同步失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 健康检查
  const healthCheck = async () => {
    try {
      const response = await fetch('/api/google-drive/health')
      const result = await response.json()
      
      setTestResults(prev => [...prev, {
        name: '健康检查',
        success: response.ok,
        result,
        timestamp: new Date().toISOString()
      }])
      
      if (response.ok) {
        toast({
          title: '健康检查成功',
          description: 'API服务正常',
        })
      } else {
        toast({
          title: '健康检查失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: '健康检查',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: '健康检查失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  const handleConnect = async () => {
    if (isLoading || isAuthenticated) return

    setIsLoading(true)
    try {
      await connect()
      toast({
        title: '连接成功',
        description: '已成功连接到 Google Drive',
      })
    } catch (error) {
      console.error('连接失败:', error)
      toast({
        title: '连接失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (isLoading || !isAuthenticated) return

    setIsLoading(true)
    try {
      await disconnect()
      toast({
        title: '断开连接',
        description: '已成功断开与 Google Drive 的连接',
      })
    } catch (error) {
      console.error('断开连接失败:', error)
      toast({
        title: '断开连接失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestUpload = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未认证",
        description: "请先连接Google Drive账户",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const tokens = localStorage.getItem('google-drive-tokens')
      if (!tokens) {
        throw new Error('未找到认证令牌')
      }

      const parsedTokens = JSON.parse(tokens)
      const response = await fetch('/api/google-drive/test-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: parsedTokens.accessToken,
          refreshToken: parsedTokens.refreshToken,
          expiresAt: parsedTokens.expiresAt
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "测试上传成功",
          description: `文件夹ID: ${result.folderId}, 文件ID: ${result.fileId}`,
        })
      } else {
        toast({
          title: "测试上传失败",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('测试上传失败:', error)
      toast({
        title: "测试上传失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    getAuthTokens()
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TestTube className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Drive 认证测试</h1>
              <p className="text-sm text-gray-600">测试认证状态和API调用</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/healthcalendar' as any)}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 认证状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              认证状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              <div className="space-y-2">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ 已连接到 Google Drive
                  </AlertDescription>
                </Alert>
                {user && (
                  <div className="text-sm space-y-1">
                    <div><strong>用户:</strong> {user.displayName}</div>
                    <div><strong>邮箱:</strong> {user.email}</div>
                    <div><strong>ID:</strong> {user.id}</div>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ 未连接到 Google Drive
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 认证令牌 */}
        <Card>
          <CardHeader>
            <CardTitle>认证令牌</CardTitle>
            <CardDescription>
              本地存储的认证信息
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authTokens ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <div><strong>Access Token:</strong> {authTokens.accessToken.substring(0, 20)}...</div>
                  <div><strong>Refresh Token:</strong> {authTokens.refreshToken.substring(0, 20)}...</div>
                  <div><strong>Expires At:</strong> {new Date(authTokens.expiresAt).toLocaleString()}</div>
                  <div><strong>Valid:</strong> {Date.now() < authTokens.expiresAt ? '✅' : '❌'}</div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  未找到认证令牌
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 测试控制 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
            <CardDescription>
              执行各种认证测试
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-4">
              <Button 
                onClick={handleConnect} 
                disabled={isLoading || isAuthenticated}
                className="w-full"
              >
                {isLoading ? "连接中..." : "连接Google Drive"}
              </Button>
              
              {isAuthenticated && (
                <>
                  <Button 
                    onClick={handleDisconnect} 
                    variant="outline"
                    className="w-full"
                  >
                    断开连接
                  </Button>
                  
                  <Button 
                    onClick={handleTestUpload} 
                    variant="secondary"
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "测试中..." : "测试上传"}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              onClick={testAuthStatusAPI}
              className="w-full"
            >
              测试认证状态API
            </Button>
            
            <Button
              onClick={testSyncAPI}
              disabled={!isAuthenticated}
              className="w-full"
            >
              测试同步API
            </Button>
            
            <Button
              onClick={testFileUpload}
              disabled={!isAuthenticated}
              className="w-full"
            >
              测试文件上传
            </Button>
            
            <Button
              onClick={testSync}
              disabled={!isAuthenticated}
              className="w-full"
            >
              测试同步
            </Button>
            
            <Button
              onClick={healthCheck}
              className="w-full"
            >
              健康检查
            </Button>
            
            <Button
              onClick={getAuthTokens}
              className="w-full"
            >
              刷新令牌信息
            </Button>
            
            <Button
              onClick={clearTestResults}
              variant="outline"
              className="w-full"
            >
              清除测试结果
            </Button>
          </CardContent>
        </Card>

        {/* 测试结果 */}
        <Card>
          <CardHeader>
            <CardTitle>测试结果</CardTitle>
            <CardDescription>
              显示测试执行结果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  暂无测试结果
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{result.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? '成功' : '失败'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                    {result.success ? (
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-xs text-red-600">
                        错误: {result.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 