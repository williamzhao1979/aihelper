import { type NextRequest, NextResponse } from "next/server"

interface V4ChatRequest {
  message: string
  provider: "deepseek" | "openai"
}

interface V4Response {
  success: boolean
  message: string
  provider: string
  error?: string
  timestamp: number
}

// OpenAI API call for V4
async function callOpenAIV4(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "你是一个有用的AI助手。请用中文回答问题，提供准确、有帮助的信息。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenAI Error Response:", errorText)

    if (response.status === 401) {
      throw new Error("OpenAI API密钥无效或余额不足")
    }
    if (response.status === 429) {
      throw new Error("OpenAI API请求频率过高，请稍后再试")
    }
    if (response.status === 500) {
      throw new Error("OpenAI服务器内部错误")
    }

    throw new Error(`OpenAI API错误: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "抱歉，我无法生成回答。"
}

// DeepSeek API call for V4
async function callDeepSeekV4(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured")
  }

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是DeepSeek AI助手。请用中文回答问题，提供深入、准确的分析和建议。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("DeepSeek Error Response:", errorText)

    if (response.status === 401) {
      throw new Error("DeepSeek API密钥无效")
    }
    if (response.status === 429) {
      throw new Error("DeepSeek API请求频率过高，请稍后再试")
    }
    if (response.status === 500) {
      throw new Error("DeepSeek服务器内部错误")
    }

    throw new Error(`DeepSeek API错误: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "抱歉，我无法生成回答。"
}

export async function POST(request: NextRequest) {
  try {
    const body: V4ChatRequest = await request.json()
    const { message, provider } = body

    // 验证输入
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "消息内容不能为空",
          timestamp: Date.now(),
        },
        { status: 400 },
      )
    }

    if (!provider || !["deepseek", "openai"].includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的AI服务提供商",
          timestamp: Date.now(),
        },
        { status: 400 },
      )
    }

    let response: string
    let providerName: string

    // 根据provider调用对应的AI服务
    if (provider === "deepseek") {
      response = await callDeepSeekV4(message)
      providerName = "DeepSeek"
    } else {
      response = await callOpenAIV4(message)
      providerName = "OpenAI"
    }

    return NextResponse.json({
      success: true,
      message: response,
      provider: providerName,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error(`V4 API Error:`, error)

    const errorMessage = error instanceof Error ? error.message : "服务暂时不可用"

    return NextResponse.json(
      {
        success: false,
        message: `抱歉，${errorMessage}。请稍后再试。`,
        error: errorMessage,
        timestamp: Date.now(),
      },
      { status: 500 },
    )
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
