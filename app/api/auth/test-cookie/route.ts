import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Test cookie set'
    })

    // 设置一个简单的测试cookie
    response.cookies.set({
      name: 'simple-test-cookie',
      value: 'simple-test-value-' + Date.now(),
      httpOnly: false, // 让客户端能看到
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 // 1小时
    })

    console.log('[Test Cookie API] 设置测试cookie成功')

    return response
  } catch (error) {
    console.error('测试cookie API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
