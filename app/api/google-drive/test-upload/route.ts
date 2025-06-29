import { NextRequest, NextResponse } from 'next/server'
import { GoogleDriveClient } from '@/lib/google-drive-client'

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken, expiresAt } = await request.json()
    
    console.log('Test upload request received')
    
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
      return NextResponse.json(
        { error: '缺少认证信息' },
        { status: 401 }
      )
    }
    
    try {
      // 创建测试文件夹
      console.log('Creating test folder...')
      const testFolder = await client.createFolder('TestUpload')
      console.log('Test folder created:', testFolder.id)
      
      // 上传测试文件
      console.log('Uploading test file...')
      const testContent = JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: 'This is a test file for debugging upload issues'
      }, null, 2)
      
      console.log('Test content length:', testContent.length)
      console.log('Test content preview:', testContent.substring(0, 100))
      
      const uploadResult = await client.uploadFile('test.json', testContent, testFolder.id)
      console.log('Test file uploaded successfully:', uploadResult.id)
      
      // 测试创建sync-status.json文件
      console.log('Creating test sync-status.json file...')
      const statusContent = JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        totalUsers: 1,
        totalRecords: 1,
        errors: []
      }, null, 2)
      
      console.log('Status content length:', statusContent.length)
      console.log('Status content:', statusContent)
      
      const statusUploadResult = await client.uploadFile('sync-status.json', statusContent, testFolder.id)
      console.log('Sync status file uploaded successfully:', statusUploadResult.id)
      
      // 测试读取上传的文件内容
      console.log('Testing file content reading...')
      try {
        const downloadedContent = await client.downloadFile(statusUploadResult.id)
        console.log('Downloaded content:', downloadedContent)
        console.log('Content matches original:', downloadedContent === statusContent)
      } catch (readError) {
        console.error('Failed to read uploaded file:', readError)
      }
      
      return NextResponse.json({
        success: true,
        folderId: testFolder.id,
        fileId: uploadResult.id,
        fileName: uploadResult.name,
        fileSize: uploadResult.size,
        statusFileId: statusUploadResult.id,
        message: '测试上传成功'
      })
      
    } catch (error) {
      console.error('Test upload failed:', error)
      return NextResponse.json({
        success: false,
        error: `测试上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Test upload request failed:', error)
    return NextResponse.json({
      success: false,
      error: `请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 })
  }
} 