import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Zod schema for URL extraction results
const ExtractUrlResultSchema = z.object({
  urls: z.array(z.string().url()).describe("List of URLs found in the image"),
  emails: z.array(z.string().email()).describe("List of email addresses found in the image"),
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
      const validatedResult = ExtractUrlResultSchema.parse(parsedResult)
      
      return validatedResult
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
        error: '没有找到图片文件'
      }, { status: 400 })
    }

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
          error: `合并处理失败: ${error instanceof Error ? error.message : '未知错误'}`
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
        results: results
      })
    }

  } catch (error: any) {
    console.error('URL extraction API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器处理错误: ' + error.message
    }, { status: 500 })
  }
}
