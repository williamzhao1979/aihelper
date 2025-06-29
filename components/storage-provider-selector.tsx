"use client"

import { useOneDriveAuth } from '@/hooks/use-onedrive-auth'
import { useGoogleDriveAuth } from '@/hooks/use-google-drive-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Cloud, 
  CloudOff, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  HardDrive,
  HardDriveIcon
} from 'lucide-react'

export function StorageProviderSelector() {
  const oneDrive = useOneDriveAuth()
  const googleDrive = useGoogleDriveAuth()

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">云存储连接</h3>
        <p className="text-sm text-muted-foreground">
          连接您的云存储服务以备份和同步健康数据
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* OneDrive */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">OneDrive</CardTitle>
              </div>
              {oneDrive.isAuthenticated && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已连接
                </Badge>
              )}
            </div>
            <CardDescription>
              Microsoft OneDrive 云存储服务
            </CardDescription>
          </CardHeader>
          <CardContent>
            {oneDrive.isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">用户:</span>
                  <span className="font-medium">{oneDrive.user?.displayName || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">邮箱:</span>
                  <span className="font-medium">{oneDrive.user?.email || 'Unknown'}</span>
                </div>
                <Separator />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={oneDrive.disconnect}
                  className="w-full"
                >
                  <CloudOff className="h-4 w-4 mr-2" />
                  断开连接
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  • 5GB 免费存储空间<br />
                  • 与 Windows 系统集成<br />
                  • 企业级安全保护
                </div>
                <Button 
                  onClick={oneDrive.connect}
                  disabled={oneDrive.loading}
                  className="w-full"
                >
                  {oneDrive.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      连接中...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      连接 OneDrive
                    </>
                  )}
                </Button>
                {oneDrive.error && (
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{oneDrive.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Drive */}
        <Card className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDriveIcon className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Google Drive</CardTitle>
              </div>
              {googleDrive.isAuthenticated && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  已连接
                </Badge>
              )}
            </div>
            <CardDescription>
              Google Drive 云存储服务
            </CardDescription>
          </CardHeader>
          <CardContent>
            {googleDrive.isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">用户:</span>
                  <span className="font-medium">{googleDrive.user?.displayName || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">邮箱:</span>
                  <span className="font-medium">{googleDrive.user?.email || 'Unknown'}</span>
                </div>
                <Separator />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={googleDrive.disconnect}
                  className="w-full"
                >
                  <CloudOff className="h-4 w-4 mr-2" />
                  断开连接
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  • 15GB 免费存储空间<br />
                  • 跨平台支持<br />
                  • 实时同步功能
                </div>
                <Button 
                  onClick={googleDrive.connect}
                  disabled={googleDrive.loading}
                  className="w-full"
                >
                  {googleDrive.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      连接中...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      连接 Google Drive
                    </>
                  )}
                </Button>
                {googleDrive.error && (
                  <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{googleDrive.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 状态信息 */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>数据加密存储</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>自动同步备份</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>隐私保护</span>
          </div>
        </div>
      </div>
    </div>
  )
} 