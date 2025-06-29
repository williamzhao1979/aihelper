'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { GoogleDriveClientSync, SyncStatus, SyncResult } from '@/lib/google-drive-client-sync'
import { Cloud, RefreshCw, Download, Upload, CheckCircle, AlertCircle, Clock, Link, Trash2, FileText } from 'lucide-react'

interface GoogleDriveSyncStatusProps {
  isConnected: boolean
}

export function GoogleDriveSyncStatus({ isConnected }: GoogleDriveSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // 获取同步状态
  const fetchSyncStatus = async () => {
    if (!isConnected) return
    
    try {
      const status = await GoogleDriveClientSync.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('获取同步状态失败:', error)
      // 设置错误状态
      setSyncStatus({
        isSyncing: false,
        lastSyncTime: null,
        syncProgress: 0,
        error: `获取状态失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }
  }

  // 初始化同步
  const initializeSync = async () => {
    setIsLoading(true)
    try {
      const result = await GoogleDriveClientSync.initializeSync()
      
      if (result.success) {
        toast({
          title: '初始化成功',
          description: `Google Drive文件夹结构已创建，文件夹ID: ${result.folderId}`,
        })
        await fetchSyncStatus()
      } else {
        toast({
          title: '初始化失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '初始化失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 同步数据
  const syncData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await GoogleDriveClientSync.syncData()
      
      if (result.success) {
        toast({
          title: "同步成功",
          description: `成功同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
        fetchSyncStatus()
      } else {
        setError(result.errors.join(', '))
        toast({
          title: "同步失败",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失败'
      setError(errorMessage)
      toast({
        title: "同步失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 同步本地数据
  const syncLocalData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await GoogleDriveClientSync.syncLocalData()
      
      if (result.success) {
        toast({
          title: "本地数据同步成功",
          description: `成功同步 ${result.syncedUsers} 个用户，${result.syncedRecords} 条记录`,
        })
        fetchSyncStatus()
      } else {
        setError(result.errors.join(', '))
        toast({
          title: "本地数据同步失败",
          description: result.errors.join(', '),
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '本地数据同步失败'
      setError(errorMessage)
      toast({
        title: "本地数据同步失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 恢复数据
  const restoreData = async () => {
    setIsLoading(true)
    try {
      const result = await GoogleDriveClientSync.restoreData()
      
      if (result.success) {
        toast({
          title: '恢复成功',
          description: `已从Google Drive恢复数据`,
        })
      } else {
        toast({
          title: '恢复失败',
          description: result.error || '未知错误',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '恢复失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 清理重复文件夹
  const cleanupDuplicateFolders = async () => {
    setIsLoading(true)
    setError(null)
    
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
      
      if (result.success) {
        toast({
          title: "清理成功",
          description: `删除了 ${result.deleted} 个重复文件夹，保留了 ${result.kept}`,
        })
        await fetchSyncStatus()
      } else {
        setError(result.error)
        toast({
          title: "清理失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清理失败'
      setError(errorMessage)
      toast({
        title: "清理失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestUpload = async () => {
    if (!isConnected) {
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

  // 清理重复状态文件
  const cleanupDuplicateStatusFiles = async () => {
    setIsLoading(true)
    setError(null)
    
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
      
      if (result.success) {
        toast({
          title: "状态文件清理成功",
          description: `删除了 ${result.deleted} 个重复状态文件，保留了 ${result.kept}`,
        })
        await fetchSyncStatus()
      } else {
        setError(result.error)
        toast({
          title: "状态文件清理失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '状态文件清理失败'
      setError(errorMessage)
      toast({
        title: "状态文件清理失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchSyncStatus()
    }
  }, [isConnected])

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive 同步
          </CardTitle>
          <CardDescription>
            请先连接Google Drive账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              需要先连接Google Drive账户才能进行数据同步
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Google Drive 同步状态
        </CardTitle>
        <CardDescription>
          管理数据同步到Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 认证状态 */}
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">已连接到 Google Drive</span>
        </div>

        {/* 同步状态 */}
        {syncStatus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">同步状态</span>
              <Badge variant={syncStatus.error ? 'destructive' : 'default'}>
                {syncStatus.error ? '错误' : '正常'}
              </Badge>
            </div>
            
            {syncStatus.lastSyncTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                最后同步: {new Date(syncStatus.lastSyncTime).toLocaleString()}
              </div>
            )}
            
            {syncStatus.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{syncStatus.error}</AlertDescription>
              </Alert>
            )}
            
            <Progress value={syncStatus.syncProgress} className="w-full" />
          </div>
        )}

        {/* 上次同步结果 */}
        {lastSyncResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">上次同步结果</span>
            </div>
            <div className="text-sm text-muted-foreground">
              用户: {lastSyncResult.syncedUsers} | 记录: {lastSyncResult.syncedRecords}
            </div>
            {lastSyncResult.folderId && (
              <div className="text-xs text-muted-foreground">
                文件夹ID: {lastSyncResult.folderId}
              </div>
            )}
            {lastSyncResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {lastSyncResult.errors.slice(0, 3).join(', ')}
                  {lastSyncResult.errors.length > 3 && `...等${lastSyncResult.errors.length}个错误`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={initializeSync}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Cloud className="h-4 w-4 mr-2" />
            初始化
          </Button>
          
          <Button
            onClick={syncData}
            disabled={isLoading}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            同步到云端
          </Button>
          
          <Button
            onClick={syncLocalData}
            disabled={isLoading}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            同步本地数据
          </Button>
          
          <Button
            onClick={restoreData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            从云端恢复
          </Button>
          
          <Button
            onClick={fetchSyncStatus}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新状态
          </Button>
          
          <Button
            onClick={handleTestUpload}
            variant="outline"
            disabled={isLoading}
            size="sm"
          >
            测试上传
          </Button>
          
          <Button
            onClick={cleanupDuplicateFolders}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清理重复文件夹
          </Button>
          
          <Button
            onClick={cleanupDuplicateStatusFiles}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            清理重复状态文件
          </Button>
        </div>

        {/* 文件夹位置信息 */}
        {lastSyncResult?.folderId && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">数据存储位置</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Google Drive → HealthCalendar/</div>
              <div>├── users/ (用户数据)</div>
              <div>├── shared/ (共享数据)</div>
              <div>├── backups/ (备份文件)</div>
              <div>└── sync-status.json (同步状态)</div>
            </div>
            <div className="mt-2 text-xs">
              <a 
                href={`https://drive.google.com/drive/folders/${lastSyncResult.folderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1"
              >
                <Link className="h-3 w-3" />
                在Google Drive中查看 →
              </a>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium mb-2 text-blue-800">使用说明</div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>1. 点击"初始化"创建Google Drive文件夹结构</div>
            <div>2. 点击"同步到云端"将数据上传到Google Drive</div>
            <div>3. 点击"从云端恢复"从Google Drive下载数据</div>
            <div>4. 点击链接可直接在Google Drive中查看文件</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 