import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Test route is working" })
}

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    console.log("=== OpenAI API Key Test ===")
    console.log("API Key exists:", !!apiKey)
    console.log("API Key starts with 'sk-':", apiKey?.startsWith("sk-"))
    console.log("API Key length:", apiKey?.length)

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OPENAI_API_KEY not found in environment variables",
        debug: {
          nodeEnv: process.env.NODE_ENV,
          hasKey: false,
        },
      })
    }

    // Test the API key with a simple request
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log("OpenAI API Response Status:", response.status)

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: "OpenAI API key is working!",
        debug: {
          status: response.status,
          modelsCount: data.data?.length || 0,
          keyPreview: apiKey.substring(0, 15) + "...",
        },
      })
    } else {
      const errorText = await response.text()
      console.log("OpenAI API Error:", errorText)

      return NextResponse.json({
        success: false,
        error: `OpenAI API returned ${response.status}`,
        details: errorText,
        debug: {
          status: response.status,
          keyPreview: apiKey.substring(0, 15) + "...",
        },
      })
    }
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
