import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Custom email validation function - more lenient than z.string().email()
const isValidEmail = (email: string): boolean => {
  // Basic email pattern that's more forgiving than Zod's default
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Custom URL validation function - more lenient than z.string().url()
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    // Try with http:// prefix if it doesn't start with a protocol
    if (!url.match(/^https?:\/\//i)) {
      try {
        new URL(`http://${url}`)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

// Zod schema for URL extraction results
const ExtractUrlResultSchema = z.object({
  urls: z.array(z.string().refine(isValidUrl, {
    message: "Invalid URL format"
  })).describe("List of URLs found in the image"),
  emails: z.array(z.string().refine(isValidEmail, {
    message: "Invalid email format"
  })).describe("List of email addresses found in the image"),
  text: z.string().describe("All text content extracted from the image")
})

type ExtractUrlResult = z.infer<typeof ExtractUrlResultSchema>

// Convert image file to base64 string
async function convertImageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')
  return `data:${file.type};base64,${base64}`
}

// Process image with retry logic
async function processImageWithRetry(file: File, retries = 3): Promise<ExtractUrlResult> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const base64Image = await convertImageToBase64(file)
      
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this image and extract all URLs and email addresses you can find. Also provide the complete text content from the image.

Requirements:
1. Extract ALL visible URLs (including http://, https://, www., and shortened URLs like bit.ly, tinyurl, etc.)
2. Extract ALL email addresses
3. Provide the complete text content from the image
4. Be thorough and accurate - don't miss any URLs or emails
5. Return results in the specified JSON format`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "url_extraction_result",
            strict: true,
            schema: {
              type: "object",
              properties: {
                urls: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of URLs found in the image"
                },
                emails: {
                  type: "array", 
                  items: { type: "string" },
                  description: "List of email addresses found in the image"
                },
                text: {
                  type: "string",
                  description: "All text content extracted from the image"
                }
              },
              required: ["urls", "emails", "text"],
              additionalProperties: false
            }
          }
        },
        max_tokens: 4000,
        temperature: 0.1
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const parsedResult = JSON.parse(content)
      
      // Clean and validate URLs before schema validation
      if (parsedResult.urls && Array.isArray(parsedResult.urls)) {
        parsedResult.urls = parsedResult.urls.filter((url: any) => {
          if (typeof url !== 'string') return false
          return isValidUrl(url.trim())
        })
      } else {
        parsedResult.urls = []
      }
      
      // Clean and validate emails before schema validation
      if (parsedResult.emails && Array.isArray(parsedResult.emails)) {
        parsedResult.emails = parsedResult.emails.filter((email: any) => {
          if (typeof email !== 'string') return false
          return isValidEmail(email.trim())
        })
      } else {
        parsedResult.emails = []
      }
      
      // Ensure text field exists
      if (typeof parsedResult.text !== 'string') {
        parsedResult.text = ''
      }
      
      try {
        const validatedResult = ExtractUrlResultSchema.parse(parsedResult)
        return validatedResult
      } catch (validationError) {
        console.warn('Schema validation failed, using cleaned result:', validationError)
        // Return cleaned result even if schema validation fails
        return {
          urls: parsedResult.urls || [],
          emails: parsedResult.emails || [],
          text: parsedResult.text || ''
        } as ExtractUrlResult
      }
    } catch (error) {
      lastError = error as Error
      console.error(`Attempt ${attempt} failed for ${file.name}:`, error)
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Failed to process image after retries')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const processingMode = formData.get('processingMode') as string || 'individual'
    const sessionId = formData.get('sessionId') as string
    const instanceId = formData.get('instanceId') as string
    
    // 记录请求信息用于调试和监控
    console.log('URL提取请求:', {
      sessionId: sessionId?.slice(-12),
      instanceId: instanceId?.slice(-8),
      processingMode,
      timestamp: new Date().toISOString()
    })
    
    // Get all uploaded image files
    const imageFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.push(value)
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到图片文件',
        sessionId,
        instanceId
      }, { status: 400 })
    }

    // 添加并发限制检查（可选）
    const maxConcurrentRequests = 10
    // 这里可以实现更复杂的队列管理逻辑

    if (processingMode === 'merged' && imageFiles.length > 1) {
      // Process all images together and merge results
      try {
        const allResults = await Promise.all(
          imageFiles.map(file => processImageWithRetry(file))
        )
        
        // Merge all results
        const mergedUrls = new Set<string>()
        const mergedEmails = new Set<string>()
        const mergedTexts: string[] = []
        
        allResults.forEach((result, index) => {
          result.urls.forEach(url => mergedUrls.add(url))
          result.emails.forEach(email => mergedEmails.add(email))
          mergedTexts.push(`=== 图片 ${index + 1}: ${imageFiles[index].name} ===\n${result.text}`)
        })
        
        return NextResponse.json({
          success: true,
          sessionId,
          instanceId,
          results: [{
            success: true,
            imageName: `合并结果 (${imageFiles.length} 张图片)`,
            urls: Array.from(mergedUrls),
            emails: Array.from(mergedEmails),
            text: mergedTexts.join('\n\n')
          }]
        })
      } catch (error) {
        console.error('Merged processing failed:', error)
        return NextResponse.json({
          success: false,
          error: `合并处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
          sessionId,
          instanceId
        }, { status: 500 })
      }
    } else {
      // Process each image individually
      const results = []
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        
        try {
          const result = await processImageWithRetry(file)
          
          results.push({
            success: true,
            imageName: file.name,
            urls: result.urls,
            emails: result.emails,
            text: result.text
          })
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error)
          results.push({
            success: false,
            imageName: file.name,
            error: error instanceof Error ? error.message : '处理失败'
          })
        }
      }

      return NextResponse.json({
        success: true,
        sessionId,
        instanceId,
        results: results
      })
    }

  } catch (error: any) {
    console.error('URL extraction API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器处理错误: ' + error.message,
      sessionId: (await request.formData()).get('sessionId'),
      instanceId: (await request.formData()).get('instanceId')
    }, { status: 500 })
  }
}
