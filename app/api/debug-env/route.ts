import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  return NextResponse.json({
    debug: {
      // Environment info
      nodeEnv: process.env.NODE_ENV,

      // API Key info (safely)
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 10) || "none",
      keyEnding: apiKey?.substring(-10) || "none",

      // Check if it's the expected format
      startsWithSkProj: apiKey?.startsWith("sk-proj-") || false,
      startsWithSk: apiKey?.startsWith("sk-") || false,

      // All environment variables that start with OPENAI (safely)
      openaiVars: Object.keys(process.env)
        .filter((key) => key.startsWith("OPENAI"))
        .map((key) => ({
          key,
          hasValue: !!process.env[key],
          length: process.env[key]?.length || 0,
        })),
    },
  })
}

export async function POST() {
  // Test loading the key in different ways
  const methods = {
    processEnv: process.env.OPENAI_API_KEY,
    // Try different possible names
    altName1: process.env.OPENAI_API_KEY,
    altName2: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  }

  return NextResponse.json({
    keyTests: Object.entries(methods).map(([method, value]) => ({
      method,
      hasValue: !!value,
      length: value?.length || 0,
      preview: value ? value.substring(0, 15) + "..." : "none",
    })),
  })
}
