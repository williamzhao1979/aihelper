import { NextResponse } from "next/server"

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "No API key found",
      })
    }

    console.log("Testing with API key:", apiKey.substring(0, 20) + "...")

    // Try a simpler request first
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
            content: "Say hello",
          },
        ],
        max_tokens: 10,
      }),
    })

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: "OpenAI API is working!",
        response: data.choices[0]?.message?.content,
      })
    } else {
      const errorData = await response.text()
      console.log("Error response:", errorData)

      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}`,
        details: errorData,
        keyPreview: apiKey.substring(0, 20) + "...",
      })
    }
  } catch (error) {
    console.error("Request failed:", error)
    return NextResponse.json({
      success: false,
      error: "Request failed",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
