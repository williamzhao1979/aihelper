import type { NextRequest } from "next/server"

interface ChatRequest {
  prompt: string
  selectedServices: {
    chatgpt: boolean
    deepseek: boolean
    github: boolean
    microsoft: boolean
  }
}

interface StreamResponse {
  service: string
  content: string
  done: boolean
  error?: string
  timestamp: number
}

// OpenAI Streaming
async function* streamOpenAI(prompt: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error("No response body")
    }

    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") {
            yield { service: "ChatGPT", content: "", done: true, timestamp: Date.now() }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ""
            if (content) {
              yield { service: "ChatGPT", content, done: false, timestamp: Date.now() }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    yield {
      service: "ChatGPT",
      content: "",
      done: true,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    }
  }
}

// DeepSeek Streaming
async function* streamDeepSeek(prompt: string) {
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error("No response body")
    }

    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") {
            yield { service: "DeepSeek", content: "", done: true, timestamp: Date.now() }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ""
            if (content) {
              yield { service: "DeepSeek", content, done: false, timestamp: Date.now() }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    yield {
      service: "DeepSeek",
      content: "",
      done: true,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    }
  }
}

// GitHub Copilot Streaming (Simulated)
async function* streamGitHubCopilot(prompt: string) {
  try {
    const fullResponse = `GitHub Copilot 流式分析: 基于您的问题 "${prompt}"，我建议您考虑以下几个方面：

1. 代码实现的最佳实践
2. 性能优化建议
3. 安全性考虑
4. 可维护性改进

这是一个模拟的流式响应，实际的 GitHub Copilot 会提供更具体的代码建议和解决方案。`

    const words = fullResponse.split("")
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30))
      yield {
        service: "GitHub Copilot",
        content: words[i],
        done: false,
        timestamp: Date.now(),
      }
    }

    yield { service: "GitHub Copilot", content: "", done: true, timestamp: Date.now() }
  } catch (error) {
    yield {
      service: "GitHub Copilot",
      content: "",
      done: true,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    }
  }
}

// Microsoft Copilot Streaming (Simulated)
async function* streamMicrosoftCopilot(prompt: string) {
  try {
    const fullResponse = `Microsoft Copilot 流式回复: 针对您的问题 "${prompt}"，我提供以下建议：

• 综合分析您的需求
• 提供多角度的解决方案
• 考虑实际应用场景
• 给出具体的实施步骤

这是一个模拟的流式响应，实际的 Microsoft Copilot 会基于您的具体需求提供更详细的帮助。`

    const words = fullResponse.split("")
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 25))
      yield {
        service: "Microsoft Copilot",
        content: words[i],
        done: false,
        timestamp: Date.now(),
      }
    }

    yield { service: "Microsoft Copilot", content: "", done: true, timestamp: Date.now() }
  } catch (error) {
    yield {
      service: "Microsoft Copilot",
      content: "",
      done: true,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { prompt, selectedServices } = body

    if (!prompt || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Create generators for selected services
        const generators: AsyncGenerator<StreamResponse>[] = []

        if (selectedServices.chatgpt) {
          generators.push(streamOpenAI(prompt))
        }
        if (selectedServices.deepseek) {
          generators.push(streamDeepSeek(prompt))
        }
        if (selectedServices.github) {
          generators.push(streamGitHubCopilot(prompt))
        }
        if (selectedServices.microsoft) {
          generators.push(streamMicrosoftCopilot(prompt))
        }

        // Process all generators concurrently
        const activeGenerators = new Map(generators.map((gen, index) => [index, gen]))

        while (activeGenerators.size > 0) {
          const promises = Array.from(activeGenerators.entries()).map(async ([index, generator]) => {
            try {
              const result = await generator.next()
              return { index, result: result.value, done: result.done }
            } catch (error) {
              return {
                index,
                result: {
                  service: "Unknown",
                  content: "",
                  done: true,
                  error: error instanceof Error ? error.message : "Unknown error",
                  timestamp: Date.now(),
                },
                done: true,
              }
            }
          })

          const results = await Promise.allSettled(promises)

          for (const promiseResult of results) {
            if (promiseResult.status === "fulfilled") {
              const { index, result, done } = promiseResult.value

              if (result) {
                // Send the chunk
                const chunk = `data: ${JSON.stringify(result)}\n\n`
                controller.enqueue(encoder.encode(chunk))
              }

              if (done) {
                activeGenerators.delete(index)
              }
            }
          }

          // Small delay to prevent overwhelming the client
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // Send completion signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Streaming API Error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
