import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

// 这里应该连接到您的数据库
// 暂时使用内存存储作为示例
const userPreferences = new Map<string, any>()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = userPreferences.get(session.user.email) || {}

    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { chatVersion } = body

    if (!chatVersion || !["v1", "v2"].includes(chatVersion)) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 })
    }

    // 保存用户偏好设置
    const currentPreferences = userPreferences.get(session.user.email) || {}
    userPreferences.set(session.user.email, {
      ...currentPreferences,
      chatVersion,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving user preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
