import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "一个 AI 助手，畅享多平台 AI 智能服务！",
  description: "AI助手 - 使用多个主流AI平台 - Ask once, get answers from multiple AI platforms",
  keywords: ["AI", "ChatGPT", "DeepSeek", "GitHub Copilot", "Microsoft Copilot", "多平台AI"],
  authors: [{ name: "Multi-Platform AI" }],
  openGraph: {
    title: "一个 AI 助手，畅享多平台 AI 智能服务！",
    description: "一次提问，多个AI平台同时回答",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "一个 AI 助手，畅享多平台 AI 智能服务！",
    description: "一次提问，多个AI平台同时回答",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-chinese antialiased">{children}</body>
    </html>
  )
}
