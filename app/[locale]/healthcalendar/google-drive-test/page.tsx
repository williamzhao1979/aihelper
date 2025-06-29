'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { GoogleDriveSyncStatus } from '@/components/google-drive-sync-status'
import { useGoogleDriveAuth } from '@/hooks/use-google-drive-auth'
import { Cloud, TestTube, ArrowLeft, Upload, Download, RefreshCw, CheckCircle, AlertCircle, Database, Users, FileText } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { GoogleDriveClientSync } from '@/lib/google-drive-client-sync'
import { useHealthDatabase } from '@/hooks/use-health-database'
import { useUserManagement } from '@/hooks/use-user-management'

export default function GoogleDriveTestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, user, connect, disconnect } = useGoogleDriveAuth()
  const { getAllRecords } = useHealthDatabase()
  const { users } = useUserManagement()
  const [testResults, setTestResults] = useState<any[]>([])
  const [localDataInfo, setLocalDataInfo] = useState<{
    users: number
    records: number
  } | null>(null)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    try {
      toast({
        title: `开始测试: ${testName}`,
        description: '正在执行...',
      })
      
      const result = await testFunction()
      
      setTestResults(prev => [...prev, {
        name: testName,
        success: true,
        result,
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: `测试成功: ${testName}`,
        description: '测试完成',
      })
      
      return result
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: testName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }])
      
      toast({
        title: `测试失败: ${testName}`,
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      })
      
      throw error
    }
  }

  const testInitializeSync = async () => {
    const result = await GoogleDriveClientSync.initializeSync()
    
    if (!result.success) {
      throw new Error(result.error || '初始化失败')
    }
    
    return result
  }

  const testSyncData = async () => {
    const result = await GoogleDriveClientSync.syncData()
    
    if (!result.success) {
      throw new Error(result.errors.join(', ') || '同步失败')
    }
    
    return result
  }

  const testGetStatus = async () => {
    const result = await GoogleDriveClientSync.getSyncStatus()
    
    if (result.error) {
      throw new Error(result.error || '获取状态失败')
    }
    
    return result
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  // 获取本地数据信息
  const getLocalDataInfo = async () => {
    setIsLoading(true)
    try {
      const records = await getAllRecords()
      setLocalDataInfo({
        users: users.length,
        records: records.length
      })
      
      toast({
        title: "本地数据信息",
        description: `用户: ${users.length}, 记录: ${records.length}`,
      })
    } catch (error) {
      toast({
        title: "获取本地数据失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 测试本地数据同步
  const testLocalDataSync = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未连接",
        description: "请先连接Google Drive账户",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await GoogleDriveClientSync.syncLocalData()
      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: "本地数据同步成功",
          description: `成功同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
      } else {
        toast({
          title: "本地数据同步失败",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '本地数据同步失败'
      toast({
        title: "本地数据同步失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 测试常规同步
  const testRegularSync = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未连接",
        description: "请先连接Google Drive账户",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await GoogleDriveClientSync.syncData()
      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: "常规同步成功",
          description: `成功同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
      } else {
        toast({
          title: "常规同步失败",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '常规同步失败'
      toast({
        title: "常规同步失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestSync = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未连接",
        description: "请先连接Google Drive账户",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await GoogleDriveClientSync.syncData()
      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: "同步成功",
          description: `成功同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
      } else {
        toast({
          title: "同步失败",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败'
      toast({
        title: "同步失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未连接",
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
      const response = await fetch('/api/google-drive/sync-with-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cleanup',
          accessToken: parsedTokens.accessToken,
          refreshToken: parsedTokens.refreshToken,
          expiresAt: parsedTokens.expiresAt
        })
      })

      const result = await response.json()
      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: "清理成功",
          description: `删除了 ${result.deleted} 个重复文件夹，保留了 ${result.kept}`,
        })
      } else {
        toast({
          title: "清理失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清理失败'
      toast({
        title: "清理失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 清理重复状态文件
  const handleCleanupStatus = async () => {
    if (!isAuthenticated) {
      toast({
        title: "未连接",
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
      const response = await fetch('/api/google-drive/sync-with-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cleanup-status',
          accessToken: parsedTokens.accessToken,
          refreshToken: parsedTokens.refreshToken,
          expiresAt: parsedTokens.expiresAt
        })
      })

      const result = await response.json()
      setSyncResult(result)
      
      if (result.success) {
        toast({
          title: "状态文件清理成功",
          description: `删除了 ${result.deleted} 个重复状态文件，保留了 ${result.kept}`,
        })
      } else {
        toast({
          title: "状态文件清理失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '状态文件清理失败'
      toast({
        title: "状态文件清理失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Google Drive 同步测试</h1>
              <p className="text-sm text-gray-600">测试本地数据同步到Google Drive的功能</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/healthcalendar')}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 连接状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              连接状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800">已连接到 Google Drive</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800">未连接到 Google Drive</span>
                  </>
                )}
              </div>
              <Button
                onClick={isAuthenticated ? disconnect : connect}
                variant={isAuthenticated ? "outline" : "default"}
              >
                {isAuthenticated ? "断开连接" : "连接 Google Drive"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 本地数据信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              本地数据信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            {localDataInfo ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm text-blue-600">用户数量</div>
                    <div className="text-lg font-semibold text-blue-800">
                      {localDataInfo.users}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm text-green-600">记录数量</div>
                    <div className="text-lg font-semibold text-green-800">
                      {localDataInfo.records}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  点击下方按钮获取本地数据信息
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-4">
              <Button
                onClick={getLocalDataInfo}
                disabled={isLoading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                获取本地数据信息
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 同步测试 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              同步测试
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={testLocalDataSync}
                disabled={!isAuthenticated || isLoading}
                className="h-20 flex flex-col items-center justify-center"
              >
                <Upload className="h-6 w-6 mb-2" />
                <span>测试本地数据同步</span>
                <span className="text-xs opacity-75">同步本地用户和记录</span>
              </Button>
              
              <Button
                onClick={testRegularSync}
                disabled={!isAuthenticated || isLoading}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center"
              >
                <Cloud className="h-6 w-6 mb-2" />
                <span>测试常规同步</span>
                <span className="text-xs opacity-75">使用服务器端数据</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 同步结果 */}
        {syncResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                同步结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">状态:</span>
                  <Badge variant={syncResult.success ? "default" : "destructive"}>
                    {syncResult.success ? "成功" : "失败"}
                  </Badge>
                </div>
                {syncResult.success && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">同步用户:</span>
                      <span className="text-sm">{syncResult.syncedUsers}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">同步记录:</span>
                      <span className="text-sm">{syncResult.syncedRecords}</span>
                    </div>
                    {syncResult.folderId && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">文件夹ID:</span>
                        <span className="text-sm font-mono text-gray-600">
                          {syncResult.folderId}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-red-600 mb-2">错误信息:</div>
                    <div className="space-y-1">
                      {syncResult.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleTestSync}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '测试中...' : '测试同步'}
          </Button>
          
          <Button
            onClick={handleCleanup}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? '清理中...' : '清理重复文件夹'}
          </Button>
          
          <Button
            onClick={handleCleanupStatus}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? '清理中...' : '清理重复状态文件'}
          </Button>
        </div>
      </div>
    </div>
  )
} 