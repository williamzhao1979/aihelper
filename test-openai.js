// Temporary test file - delete after testing
const testOpenAI = async () => {
  const apiKey = process.env.OPENAI_API_KEY

  console.log("API Key exists:", !!apiKey)
  console.log("API Key starts with sk-:", apiKey?.startsWith("sk-"))
  console.log("API Key length:", apiKey?.length)

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Response status:", response.status)

    if (response.ok) {
      console.log("✅ OpenAI API key is working!")
    } else {
      const error = await response.text()
      console.log("❌ OpenAI API error:", error)
    }
  } catch (error) {
    console.log("❌ Network error:", error)
  }
}

// Run this in your browser console or Node.js
testOpenAI()
