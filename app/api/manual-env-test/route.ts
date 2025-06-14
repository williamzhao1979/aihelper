import { NextResponse } from "next/server"

export async function GET() {
  // Manual check of what Next.js is actually loading
  const envFiles = [".env.local", ".env.development.local", ".env.development", ".env"]

  const results = {
    currentWorkingDir: process.cwd(),
    nodeEnv: process.env.NODE_ENV,

    // Check what's actually in process.env
    openaiFromEnv: process.env.OPENAI_API_KEY
      ? {
          exists: true,
          length: process.env.OPENAI_API_KEY.length,
          startsWithSk: process.env.OPENAI_API_KEY.startsWith("sk-"),
          preview: process.env.OPENAI_API_KEY.substring(0, 20) + "...",
        }
      : { exists: false },

    // All environment variables containing 'OPENAI'
    allOpenAIVars: Object.keys(process.env)
      .filter((key) => key.toLowerCase().includes("openai"))
      .map((key) => ({
        key,
        hasValue: !!process.env[key],
        length: process.env[key]?.length || 0,
      })),

    // Test if we can manually set and read
    testVar: process.env.TEST_MANUAL_VAR || "not-set",
  }

  return NextResponse.json(results)
}

export async function POST() {
  // Try to manually test OpenAI with whatever key is loaded
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      error: "No OpenAI API key found in environment",
      availableKeys: Object.keys(process.env).filter((k) => k.includes("OPENAI")),
    })
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      keyPreview: apiKey.substring(0, 20) + "...",
      keyLength: apiKey.length,
      message: response.ok ? "API key works!" : "API key failed",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      keyPreview: apiKey.substring(0, 20) + "...",
    })
  }
}
