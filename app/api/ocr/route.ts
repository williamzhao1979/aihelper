import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the expected response schema
const OCRResponseSchema = z.object({
  lang: z.string(),
  text: z.string(),
  advice: z.array(z.string()),
  text_refined: z.string(),
  return: z.string(),
  end: z.string(),
})

// Relaxed schema for fallback processing
const RelaxedOCRResponseSchema = z.object({
  lang: z.string().optional().default("unknown"),
  text: z.string().optional().default(""),
  advice: z.array(z.string()).optional().default([]),
  text_refined: z.string().optional().default(""),
  return: z.string().optional().default("processed"),
  end: z.string().optional().default("complete"),
})

// Merged response schema
const MergedOCRResponseSchema = z.object({
  lang: z.string(),
  text: z.string(),
  advice: z.array(z.string()),
  text_refined: z.string(),
  return: z.string(),
  end: z.string(),
  image_count: z.number(),
})

const RelaxedMergedOCRResponseSchema = z.object({
  lang: z.string().optional().default("unknown"),
  text: z.string().optional().default(""),
  advice: z.array(z.string()).optional().default([]),
  text_refined: z.string().optional().default(""),
  return: z.string().optional().default("processed"),
  end: z.string().optional().default("complete"),
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
                text: `请分析这张图片中的文本内容，并按照以下JSON格式返回结果。请确保返回的是有效的JSON格式：

{
  "lang": "检测到的语言（如：中文、英文、日文等）",
  "text": "提取的原始文本内容",
  "advice": ["修改建议1", "修改建议2", "修改建议3"],
  "text_refined": "修正后的文本内容",
  "return": "处理状态（如：成功、完成等）",
  "end": "结束标识"
}

请仔细提取图片中的所有文字，并提供语法、拼写、格式等方面的改进建议。`,
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
        const validatedResponse = OCRResponseSchema.parse(parsedResponse)
        console.log(`Successfully validated ${imageName} with strict schema`)
        return validatedResponse
      } catch (strictError) {
        console.warn(`Strict validation failed for ${imageName}, trying relaxed schema:`, strictError)

        // Try relaxed validation
        try {
          const relaxedResponse = RelaxedOCRResponseSchema.parse(parsedResponse)
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
                text: `请分析这${base64Images.length}张图片中的文本内容，按照图片顺序合并所有文本，并按照以下JSON格式返回结果：

{
  "lang": "检测到的主要语言",
  "text": "按顺序合并的所有原始文本内容",
  "advice": ["针对合并文本的修改建议1", "修改建议2", "修改建议3"],
  "text_refined": "修正后的完整文本内容",
  "return": "处理状态",
  "end": "结束标识",
  "image_count": ${base64Images.length}
}

请按照图片的顺序提取和合并文字，确保文本的连贯性和逻辑性。`,
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
        const validatedResponse = MergedOCRResponseSchema.parse(parsedResponse)
        console.log("Successfully validated merged response with strict schema")
        return validatedResponse
      } catch (strictError) {
        console.warn("Strict validation failed for merged response, trying relaxed schema:", strictError)

        // Try relaxed validation
        try {
          const relaxedResponse = RelaxedMergedOCRResponseSchema.parse(parsedResponse)
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
    console.error("OCR API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
