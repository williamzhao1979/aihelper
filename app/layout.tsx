import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "我的工具箱 - 精选工具，让生活更顺心",
  description: "我的工具箱 - 包含URL提取器、音频提取器、AI助手等多种实用工具，提升工作效率，简化日常任务",
  keywords: ["工具箱", "URL提取器", "音频提取器", "AI助手", "文本工具", "实用工具", "效率工具"],
  authors: [{ name: "William Zhao" }],
  openGraph: {
    title: "我的工具箱 - 精选工具，让生活更顺心",
    description: "包含URL提取器、音频提取器、AI助手等多种实用工具，提升工作效率",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "我的工具箱 - 精选工具，让生活更顺心",
    description: "包含URL提取器、音频提取器、AI助手等多种实用工具，提升工作效率",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params?.locale || "zh";
  return (
    <html lang={locale}>
      <body className="font-chinese antialiased">{children}</body>
    </html>
  )
}
