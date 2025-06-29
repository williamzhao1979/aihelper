import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Google Drive API健康检查正常'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      receivedData: body,
      message: 'POST请求处理正常'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: `POST请求处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 