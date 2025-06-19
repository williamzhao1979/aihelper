import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const merge = formData.get("merge") === "true"
    const noWait = formData.get("noWait") === "true"

    if (!images || images.length === 0) {
      return NextResponse.json({ success: false, error: "没有上传图片" }, { status: 400 })
    }

    // 验证API密钥
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: "OpenAI API密钥未配置" }, { status: 500 })
    }

    // 转换图片为base64
    const imageContents = await Promise.all(
      images.map(async (image) => {
        const bytes = await image.arrayBuffer()
        const base64 = Buffer.from(bytes).toString("base64")
        return {
          type: "image_url" as const,
          image_url: {
            url: `data:${image.type};base64,${base64}`,
            detail: "high" as const,
          },
        }
      }),
    )

    // 构建提示词
    const systemPrompt = `你是一位专业的艺术评论家和绘画导师。请对上传的绘画作品进行专业分析和评价。

请按照以下格式返回JSON结果：
{
  "style": "识别的艺术风格（如：写实主义、印象派、抽象表现主义等）",
  "description": "详细描述作品的构图、色彩、技法、主题等艺术元素",
  "evaluation": "专业的艺术评价，包括作品的优点、特色、艺术价值等",
  "suggestions": ["具体的改进建议1", "具体的改进建议2", "具体的改进建议3"],
  "return": "总结性评价",
  "end": "鼓励性结语"
}

请用中文回答，评价要专业、客观、建设性。`

    const userPrompt = merge
      ? `请对这${images.length}幅绘画作品进行整体系列评价，分析它们之间的关联性、风格统一性和艺术发展脉络。`
      : `请对这幅绘画作品进行详细的艺术分析和专业评价。`

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }, ...imageContents],
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      return NextResponse.json({ success: false, error: "未收到AI回复" }, { status: 500 })
    }

    // 尝试解析JSON响应
    let result
    try {
      // 提取JSON部分（如果响应包含其他文本）
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText
      result = JSON.parse(jsonText)
    } catch (parseError) {
      // 如果无法解析JSON，创建一个基本结构
      result = {
        style: "未识别",
        description: responseText,
        evaluation: "AI分析完成",
        suggestions: ["继续练习和创作"],
        return: "感谢分享您的作品",
        end: "继续加油！",
      }
    }

    // 确保suggestions是数组
    if (!Array.isArray(result.suggestions)) {
      result.suggestions = [result.suggestions || "继续练习和创作"]
    }

    const response = {
      success: true,
      result: result,
      batchId: noWait ? `batch_${Date.now()}` : undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Art review API error:", error)

    let errorMessage = "处理失败"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
