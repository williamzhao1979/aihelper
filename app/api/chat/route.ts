import { type NextRequest, NextResponse } from "next/server"

interface ChatRequest {
  prompt: string
  selectedServices: {
    chatgpt: boolean
    deepseek: boolean
    github: boolean
    microsoft: boolean
  }
}

interface AIResponse {
  service: string
  response: string
  error?: string
  timestamp: number
}

// OpenAI API call with better error handling
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  // Debug logging
  console.log("OpenAI API Key exists:", !!apiKey)
  console.log("OpenAI API Key format:", apiKey?.substring(0, 10) + "...")

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
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  })

  console.log("OpenAI Response Status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.log("OpenAI Error Response:", errorText)

    if (response.status === 401) {
      throw new Error(
        `OpenAI Authentication Error: Invalid API key or insufficient credits. Please check your API key and billing setup.`,
      )
    }

    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "No response generated"
}

// DeepSeek API call
async function callDeepSeek(prompt: string): Promise<string> {
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
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "No response generated"
}

// GitHub Copilot simulation (as it doesn't have a public API)
async function callGitHubCopilot(prompt: string): Promise<string> {
  // Simulate GitHub Copilot response
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

  return `GitHub Copilot 分析: 基于您的问题 "${prompt}"，我建议您考虑以下几个方面：

1. 代码实现的最佳实践
2. 性能优化建议
3. 安全性考虑
4. 可维护性改进

这是一个模拟响应，实际的 GitHub Copilot 会提供更具体的代码建议和解决方案。`
}

// Microsoft Copilot using Azure OpenAI
async function callMicrosoftCopilot(prompt: string): Promise<string> {
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    // Fallback simulation if Azure OpenAI is not configured
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))
    return `Microsoft Copilot 回复: 针对您的问题 "${prompt}"，我提供以下建议：

• 综合分析您的需求
• 提供多角度的解决方案
• 考虑实际应用场景
• 给出具体的实施步骤

这是一个模拟响应，实际的 Microsoft Copilot 会基于您的具体需求提供更详细的帮助。`
  }

  const response = await fetch(
    `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-35-turbo/chat/completions?api-version=2023-12-01-preview`,
    {
      method: "POST",
      headers: {
        "api-key": process.env.AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are Microsoft Copilot, a helpful AI assistant. Respond in Chinese when the user asks in Chinese.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "No response generated"
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { prompt, selectedServices } = body

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const promises: Promise<AIResponse>[] = []

    // Create promises for selected services
    if (selectedServices.chatgpt) {
      promises.push(
        callOpenAI(prompt)
          .then((response) => ({
            service: "ChatGPT",
            response,
            timestamp: Date.now(),
          }))
          .catch((error) => ({
            service: "ChatGPT",
            response: "",
            error: error.message,
            timestamp: Date.now(),
          })),
      )
    }

    if (selectedServices.deepseek) {
      promises.push(
        callDeepSeek(prompt)
          .then((response) => ({
            service: "DeepSeek",
            response,
            timestamp: Date.now(),
          }))
          .catch((error) => ({
            service: "DeepSeek",
            response: "",
            error: error.message,
            timestamp: Date.now(),
          })),
      )
    }

    if (selectedServices.github) {
      promises.push(
        callGitHubCopilot(prompt)
          .then((response) => ({
            service: "GitHub Copilot",
            response,
            timestamp: Date.now(),
          }))
          .catch((error) => ({
            service: "GitHub Copilot",
            response: "",
            error: error.message,
            timestamp: Date.now(),
          })),
      )
    }

    if (selectedServices.microsoft) {
      promises.push(
        callMicrosoftCopilot(prompt)
          .then((response) => ({
            service: "Microsoft Copilot",
            response,
            timestamp: Date.now(),
          }))
          .catch((error) => ({
            service: "Microsoft Copilot",
            response: "",
            error: error.message,
            timestamp: Date.now(),
          })),
      )
    }

    // Execute all API calls in parallel
    const results = await Promise.all(promises)

    return NextResponse.json({
      success: true,
      results,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
