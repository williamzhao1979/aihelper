import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the expected response schema
const ArtReviewResponseSchema = z.object({
  style: z.string(),
  description: z.string(),
  suggestions: z.array(z.string()),
  evaluation: z.string(),
  return: z.string(),
  end: z.string(),
})

// Relaxed schema for fallback processing
const RelaxedArtReviewResponseSchema = z.object({
  style: z.string().optional().default("未识别风格"),
  description: z.string().optional().default(""),
  suggestions: z.array(z.string()).optional().default([]),
  evaluation: z.string().optional().default(""),
  return: z.string().optional().default("评价完成"),
  end: z.string().optional().default("继续创作"),
})

// Merged response schema
const MergedArtReviewResponseSchema = z.object({
  style: z.string(),
  description: z.string(),
  suggestions: z.array(z.string()),
  evaluation: z.string(),
  return: z.string(),
  end: z.string(),
  image_count: z.number(),
})

const RelaxedMergedArtReviewResponseSchema = z.object({
  style: z.string().optional().default("未识别风格"),
  description: z.string().optional().default(""),
  suggestions: z.array(z.string()).optional().default([]),
  evaluation: z.string().optional().default(""),
  return: z.string().optional().default("评价完成"),
  end: z.string().optional().default("继续创作"),
  image_count: z.number().optional().default(0),
})

async function convertImageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString("base64")
  return `data:${file.type};base64,${base64}`
}

async function processImageWithRetry(base64Image: string, imageName: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing ${imageName}, attempt ${attempt}/${maxRetries}`)

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `请作为专业的艺术评论家，对这幅绘画作品进行详细分析和评价。请按照以下JSON格式返回结果：

{
  "style": "识别的艺术风格（如：写实主义、印象派、抽象表现主义、水彩画、油画、素描等）",
  "description": "详细描述作品的构图、色彩运用、绘画技法、主题内容、视觉效果等艺术元素",
  "evaluation": "专业的艺术评价，包括作品的优点、特色、艺术价值、情感表达、创意性等",
  "suggestions": ["具体的技法改进建议1", "构图或色彩建议2", "创作方向建议3"],
  "return": "总结性评价",
  "end": "鼓励性结语"
}

请用专业但易懂的中文进行评价，既要客观专业，也要给予建设性的指导建议。`,
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      console.log(`Raw response for ${imageName}:`, content)

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      const jsonStr = jsonMatch[0]
      let parsedResponse

      try {
        parsedResponse = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error(`JSON parse error for ${imageName}:`, parseError)
        throw new Error(`Invalid JSON format: ${parseError}`)
      }

      // Try strict validation first
      try {
        const validatedResponse = ArtReviewResponseSchema.parse(parsedResponse)
        console.log(`Successfully validated ${imageName} with strict schema`)
        return validatedResponse
      } catch (strictError) {
        console.warn(`Strict validation failed for ${imageName}, trying relaxed schema:`, strictError)

        // Try relaxed validation
        try {
          const relaxedResponse = RelaxedArtReviewResponseSchema.parse(parsedResponse)
          console.log(`Successfully validated ${imageName} with relaxed schema`)
          return relaxedResponse
        } catch (relaxedError) {
          console.error(`Both validations failed for ${imageName}:`, relaxedError)
          throw new Error(`Schema validation failed: ${relaxedError}`)
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${imageName}:`, error)
      lastError = error as Error

      if (attempt < maxRetries) {
        console.log(`Retrying ${imageName} in 1 second...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError || new Error(`Failed to process ${imageName} after ${maxRetries} attempts`)
}

async function processMergedImagesWithRetry(
  base64Images: string[],
  imageNames: string[],
  maxRetries = 2,
): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing merged images, attempt ${attempt}/${maxRetries}`)

      const imageContent = base64Images.map((base64, index) => ({
        type: "image_url" as const,
        image_url: {
          url: base64,
          detail: "high" as const,
        },
      }))

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `请作为专业的艺术评论家，对这${base64Images.length}幅绘画作品进行整体系列评价。请按照以下JSON格式返回结果：

{
  "style": "识别的主要艺术风格或风格演变",
  "description": "按顺序分析所有作品的整体特征、风格统一性、主题关联性、技法发展等",
  "evaluation": "对整个作品系列的专业评价，包括系列的完整性、艺术价值、创作理念等",
  "suggestions": ["针对整个系列的改进建议1", "风格发展建议2", "创作方向建议3"],
  "return": "系列作品总结性评价",
  "end": "鼓励性结语",
  "image_count": ${base64Images.length}
}

请分析作品之间的关联性、风格统一性和艺术发展脉络，给出专业的系列作品评价。`,
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      console.log("Raw merged response:", content)

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      const jsonStr = jsonMatch[0]
      let parsedResponse

      try {
        parsedResponse = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error("JSON parse error for merged response:", parseError)
        throw new Error(`Invalid JSON format: ${parseError}`)
      }

      // Ensure image_count is set
      if (!parsedResponse.image_count) {
        parsedResponse.image_count = base64Images.length
      }

      // Try strict validation first
      try {
        const validatedResponse = MergedArtReviewResponseSchema.parse(parsedResponse)
        console.log("Successfully validated merged response with strict schema")
        return validatedResponse
      } catch (strictError) {
        console.warn("Strict validation failed for merged response, trying relaxed schema:", strictError)

        // Try relaxed validation
        try {
          const relaxedResponse = RelaxedMergedArtReviewResponseSchema.parse(parsedResponse)
          relaxedResponse.image_count = base64Images.length // Ensure count is correct
          console.log("Successfully validated merged response with relaxed schema")
          return relaxedResponse
        } catch (relaxedError) {
          console.error("Both validations failed for merged response:", relaxedError)
          throw new Error(`Schema validation failed: ${relaxedError}`)
        }
      }
    } catch (error) {
      console.error(`Merged processing attempt ${attempt} failed:`, error)
      lastError = error as Error

      if (attempt < maxRetries) {
        console.log("Retrying merged processing in 1 second...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError || new Error(`Failed to process merged images after ${maxRetries} attempts`)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mergeImages = formData.get("mergeImages") === "true"

    // Extract images from FormData
    const images: { file: File; index: number }[] = []

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("image_") && value instanceof File) {
        const index = Number.parseInt(key.replace("image_", ""))
        images.push({ file: value, index })
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ success: false, error: "No images provided" }, { status: 400 })
    }

    // Sort images by index to maintain order
    images.sort((a, b) => a.index - b.index)

    console.log(`Processing ${images.length} images, merge: ${mergeImages}`)

    if (mergeImages) {
      // Process all images together
      try {
        const base64Images = await Promise.all(images.map(({ file }) => convertImageToBase64(file)))
        const imageNames = images.map(({ file }) => file.name)

        const result = await processMergedImagesWithRetry(base64Images, imageNames)

        return NextResponse.json({
          success: true,
          merged: true,
          result: result,
        })
      } catch (error) {
        console.error("Merged processing failed:", error)
        return NextResponse.json(
          {
            success: false,
            merged: true,
            error: error instanceof Error ? error.message : "Failed to process merged images",
          },
          { status: 500 },
        )
      }
    } else {
      // Process images individually
      const results = []

      for (let i = 0; i < images.length; i++) {
        const { file, index } = images[i]

        try {
          const base64Image = await convertImageToBase64(file)
          const result = await processImageWithRetry(base64Image, file.name)

          results.push({
            imageIndex: index,
            imageName: file.name,
            success: true,
            result: result,
          })
        } catch (error) {
          console.error(`Failed to process image ${file.name}:`, error)
          results.push({
            imageIndex: index,
            imageName: file.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      return NextResponse.json({
        success: true,
        merged: false,
        results: results,
      })
    }
  } catch (error) {
    console.error("Art review API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
