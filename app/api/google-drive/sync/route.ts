import { NextRequest, NextResponse } from 'next/server'
import { GoogleDriveClient } from '@/lib/google-drive-client'
import { GoogleDriveSyncManager } from '@/lib/google-drive-sync-manager'

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json()
    
    // 创建Google Drive客户端配置
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/google-drive-callback`,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    }
    
    // 创建Google Drive客户端
    const client = new GoogleDriveClient(config)
    
    // 尝试从localStorage或sessionStorage中加载令牌
    // 注意：在服务器端无法直接访问浏览器的localStorage
    // 我们需要通过其他方式传递认证信息
    
    // 检查认证状态 - 在服务器端，我们需要通过其他方式验证
    // 暂时跳过认证检查，让客户端处理认证状态
    const syncManager = new GoogleDriveSyncManager(client)
    
    switch (action) {
      case 'initialize':
        try {
          // 初始化同步文件夹结构
          const folderId = await syncManager.initializeSync()
          return NextResponse.json({ 
            success: true, 
            folderId,
            message: 'Google Drive文件夹结构创建成功'
          })
        } catch (error) {
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          throw error
        }
        
      case 'sync':
        try {
          // 同步所有数据
          const syncResult = await syncManager.syncAllData()
          return NextResponse.json(syncResult)
        } catch (error) {
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          throw error
        }
        
      case 'status':
        try {
          // 获取同步状态
          const status = await syncManager.getSyncStatus()
          return NextResponse.json(status)
        } catch (error) {
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          throw error
        }
        
      case 'restore':
        try {
          // 从Google Drive恢复数据
          const restoredData = await syncManager.restoreFromGoogleDrive()
          return NextResponse.json({ 
            success: true, 
            data: restoredData 
          })
        } catch (error) {
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          throw error
        }
        
      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Google Drive同步操作失败:', error)
    
    // 根据错误类型返回不同的状态码
    if (error instanceof Error) {
      if (error.message.includes('未认证') || error.message.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
          { status: 401 }
        )
      }
    }
    
    return NextResponse.json(
      { error: `同步操作失败: ${error}` },
      { status: 500 }
    )
  }
} 