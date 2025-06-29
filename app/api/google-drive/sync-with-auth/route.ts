import { NextRequest, NextResponse } from 'next/server'
import { GoogleDriveClient } from '@/lib/google-drive-client'
import { GoogleDriveSyncManager } from '@/lib/google-drive-sync-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, accessToken, refreshToken, expiresAt } = body
    
    console.log('Google Drive sync request:', { action, hasAccessToken: !!accessToken })
    
    // 创建Google Drive客户端配置
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/google-drive-callback`,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    }
    
    // 创建Google Drive客户端
    const client = new GoogleDriveClient(config)
    
    // 设置认证令牌
    if (accessToken && refreshToken && expiresAt) {
      client.setTokens({
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt)
      })
    } else {
      console.error('Missing authentication tokens')
      return NextResponse.json(
        { error: '缺少认证信息' },
        { status: 401 }
      )
    }
    
    const syncManager = new GoogleDriveSyncManager(client)
    
    switch (action) {
      case 'initialize':
        try {
          console.log('Initializing Google Drive sync...')
          // 初始化同步文件夹结构
          const folderId = await syncManager.initializeSync()
          console.log('Sync initialization successful:', folderId)
          return NextResponse.json({ 
            success: true, 
            folderId,
            message: 'Google Drive文件夹结构创建成功'
          })
        } catch (error) {
          console.error('初始化失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `初始化失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'sync':
        try {
          console.log('Starting Google Drive sync...')
          // 同步所有数据
          const syncResult = await syncManager.syncAllData()
          console.log('Sync completed:', syncResult)
          return NextResponse.json(syncResult)
        } catch (error) {
          console.error('同步失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `同步失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'status':
        try {
          console.log('Getting sync status...')
          // 获取同步状态
          const status = await syncManager.getSyncStatus()
          console.log('Sync status result:', status)
          
          // 确保返回的是有效的对象
          const responseData = {
            isSyncing: status.isSyncing || false,
            lastSyncTime: status.lastSyncTime ? status.lastSyncTime.toISOString() : null,
            syncProgress: status.syncProgress || 0,
            error: status.error || null
          }
          
          console.log('Sending sync status response:', responseData)
          return NextResponse.json(responseData)
        } catch (error) {
          console.error('获取状态失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `获取状态失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'restore':
        try {
          console.log('Restoring data from Google Drive...')
          // 从Google Drive恢复数据
          const restoredData = await syncManager.restoreFromGoogleDrive()
          console.log('Data restoration completed')
          return NextResponse.json({ 
            success: true, 
            data: restoredData 
          })
        } catch (error) {
          console.error('恢复失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `恢复失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'test-sync':
        try {
          console.log('Testing Google Drive sync...')
          // 测试同步
          const testResult = await syncManager.testSync()
          console.log('Test sync completed:', testResult)
          return NextResponse.json(testResult)
        } catch (error) {
          console.error('测试同步失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `测试同步失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'sync-local-data':
        try {
          console.log('Starting local data sync to Google Drive...')
          const { localData } = body
          
          if (!localData) {
            return NextResponse.json(
              { error: '缺少本地数据' },
              { status: 400 }
            )
          }
          
          // 同步本地数据到Google Drive
          const syncResult = await syncManager.syncLocalData(localData)
          console.log('Local data sync completed:', syncResult)
          return NextResponse.json(syncResult)
        } catch (error) {
          console.error('本地数据同步失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `本地数据同步失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'cleanup':
        try {
          console.log('Starting cleanup of duplicate folders...')
          // 清理重复的HealthCalendar文件夹
          const cleanupResult = await syncManager.cleanupDuplicateFolders()
          console.log('Cleanup completed:', cleanupResult)
          return NextResponse.json({
            success: true,
            ...cleanupResult,
            message: `清理完成: 删除了 ${cleanupResult.deleted} 个重复文件夹，保留了 ${cleanupResult.kept}`
          })
        } catch (error) {
          console.error('清理失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `清理失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      case 'cleanup-status':
        try {
          console.log('Starting cleanup of duplicate status files...')
          // 清理重复的sync-status.json文件
          const cleanupResult = await syncManager.cleanupDuplicateStatusFiles()
          console.log('Status cleanup completed:', cleanupResult)
          return NextResponse.json({
            success: true,
            ...cleanupResult,
            message: `状态文件清理完成: 删除了 ${cleanupResult.deleted} 个重复状态文件，保留了 ${cleanupResult.kept}`
          })
        } catch (error) {
          console.error('状态文件清理失败:', error)
          if (error instanceof Error && error.message.includes('未认证')) {
            return NextResponse.json(
              { error: 'Google Drive未认证，请先在客户端连接Google Drive账户' },
              { status: 401 }
            )
          }
          return NextResponse.json(
            { error: `状态文件清理失败: ${error instanceof Error ? error.message : '未知错误'}` },
            { status: 500 }
          )
        }
        
      default:
        console.error('Unsupported action:', action)
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Google Drive同步操作失败:', error)
    
    // 确保总是返回有效的JSON响应
    return NextResponse.json(
      { error: `请求处理失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
} 