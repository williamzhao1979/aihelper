"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, User, Sparkles, Zap, Brain, Cpu } from "lucide-react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  provider?: "deepseek" | "openai"
}

interface MultiPlatformAIV4Props {
  currentVersion: string
  onVersionChange: (version: "v1" | "v2" | "v3" | "v4") => void
}

export default function MultiPlatformAIV4({ currentVersion, onVersionChange }: MultiPlatformAIV4Props) {
  const [deepseekMessages, setDeepseekMessages] = useState<Message[]>([])
  const [openaiMessages, setOpenaiMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isDeepseekLoading, setIsDeepseekLoading] = useState(false)
  const [isOpenaiLoading, setIsOpenaiLoading] = useState(false)
  const deepseekScrollRef = useRef<HTMLDivElement>(null)
  const openaiScrollRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()
  const t = useTranslations()

  useEffect(() => {
    if (deepseekScrollRef.current) {
      deepseekScrollRef.current.scrollTop = deepseekScrollRef.current.scrollHeight
    }
  }, [deepseekMessages])

  useEffect(() => {
    if (openaiScrollRef.current) {
      openaiScrollRef.current.scrollTop = openaiScrollRef.current.scrollHeight
    }
  }, [openaiMessages])

  const handleSendMessage = async () => {
    if (!input.trim() || (isDeepseekLoading && isOpenaiLoading)) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    // 添加用户消息到两个对话中
    setDeepseekMessages((prev) => [...prev, userMessage])
    setOpenaiMessages((prev) => [...prev, userMessage])

    // 不清空输入框，保留之前的输入
    setIsDeepseekLoading(true)
    setIsOpenaiLoading(true)

    // 同时调用两个AI服务
    const deepseekPromise = callAI("deepseek", input)
    const openaiPromise = callAI("openai", input)

    try {
      const [deepseekResponse, openaiResponse] = await Promise.allSettled([deepseekPromise, openaiPromise])

      // 处理 DeepSeek 响应
      if (deepseekResponse.status === "fulfilled") {
        const deepseekMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: deepseekResponse.value || "抱歉，DeepSeek 现在无法回应。请稍后再试。",
          role: "assistant",
          timestamp: new Date(),
          provider: "deepseek",
        }
        setDeepseekMessages((prev) => [...prev, deepseekMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "抱歉，DeepSeek 服务出现错误。请稍后再试。",
          role: "assistant",
          timestamp: new Date(),
          provider: "deepseek",
        }
        setDeepseekMessages((prev) => [...prev, errorMessage])
      }

      // 处理 OpenAI 响应
      if (openaiResponse.status === "fulfilled") {
        const openaiMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: openaiResponse.value || "抱歉，OpenAI 现在无法回应。请稍后再试。",
          role: "assistant",
          timestamp: new Date(),
          provider: "openai",
        }
        setOpenaiMessages((prev) => [...prev, openaiMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: "抱歉，OpenAI 服务出现错误。请稍后再试。",
          role: "assistant",
          timestamp: new Date(),
          provider: "openai",
        }
        setOpenaiMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      setIsDeepseekLoading(false)
      setIsOpenaiLoading(false)
    }
  }

  const callAI = async (provider: "deepseek" | "openai", message: string): Promise<string> => {
    const response = await fetch("/api/chat/v4", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        provider,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `${provider} 服务调用失败`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || data.message || `${provider} 返回错误`)
    }

    return data.message
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderMessages = (messages: Message[], isLoading: boolean, provider: "deepseek" | "openai") => {
    return (
      <div className="space-y-4">
        {messages.length === 0 && (
          <Card className="border-dashed border-2 border-purple-200 bg-white/50">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="flex items-center gap-2 mb-3">
                {provider === "deepseek" ? (
                  <Brain className="h-6 w-6 text-blue-500" />
                ) : (
                  <Cpu className="h-6 w-6 text-green-500" />
                )}
              </div>
              <h3 className="text-md font-semibold text-gray-800 mb-1">
                {provider === "deepseek" ? "DeepSeek AI" : "OpenAI GPT"}
              </h3>
              <p className="text-gray-600 text-center text-sm">
                {provider === "deepseek" ? "深度思考，智能回答" : "创新对话，精准回复"}
              </p>
            </CardContent>
          </Card>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <Avatar className="h-7 w-7 border-2 border-purple-200 flex-shrink-0">
                <AvatarFallback
                  className={`${provider === "deepseek" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-green-500 to-emerald-500"} text-white`}
                >
                  {provider === "deepseek" ? <Brain className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
            )}

            <Card
              className={`max-w-[85%] ${
                message.role === "user"
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0"
                  : "bg-white/80 backdrop-blur-sm border-purple-100"
              }`}
            >
              <CardContent className="p-2">
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === "user" ? "text-purple-100" : "text-gray-500"}`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>

            {message.role === "user" && (
              <Avatar className="h-7 w-7 border-2 border-blue-200 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <Avatar className="h-7 w-7 border-2 border-purple-200 flex-shrink-0">
              <AvatarFallback
                className={`${provider === "deepseek" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-green-500 to-emerald-500"} text-white`}
              >
                {provider === "deepseek" ? <Brain className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div
                      className={`w-1.5 h-1.5 ${provider === "deepseek" ? "bg-blue-500" : "bg-green-500"} rounded-full animate-bounce`}
                    ></div>
                    <div
                      className={`w-1.5 h-1.5 ${provider === "deepseek" ? "bg-cyan-500" : "bg-emerald-500"} rounded-full animate-bounce`}
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className={`w-1.5 h-1.5 ${provider === "deepseek" ? "bg-indigo-500" : "bg-teal-500"} rounded-full animate-bounce`}
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">
                    {provider === "deepseek" ? "DeepSeek思考中..." : "OpenAI生成中..."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-purple-600" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI助手 V4 - 双引擎对比
              </h1>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              <Sparkles className="h-3 w-3 mr-1" />
              超级版
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {session?.user && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || ""} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{session.user.name || session.user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area - 双列布局 */}
      <div className="flex-1 flex min-h-0">
        {/* DeepSeek 左侧 */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h2 className="font-semibold">DeepSeek AI</h2>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                深度思考
              </Badge>
            </div>
          </div>
          <ScrollArea className="flex-1 p-3" ref={deepseekScrollRef}>
            {renderMessages(deepseekMessages, isDeepseekLoading, "deepseek")}
          </ScrollArea>
        </div>

        {/* OpenAI 右侧 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              <h2 className="font-semibold">OpenAI GPT</h2>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                创新对话
              </Badge>
            </div>
          </div>
          <ScrollArea className="flex-1 p-3" ref={openaiScrollRef}>
            {renderMessages(openaiMessages, isOpenaiLoading, "openai")}
          </ScrollArea>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-white/80 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="输入您的问题... (Ctrl+Enter 发送)"
              disabled={isDeepseekLoading && isOpenaiLoading}
              className="flex-1 min-h-[80px] border-purple-200 focus:border-purple-400 focus:ring-purple-400 resize-none"
              rows={3}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || (isDeepseekLoading && isOpenaiLoading)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 self-end"
              size="lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">同时向 DeepSeek 和 OpenAI 发送问题，对比不同AI的回答效果</p>
        </div>
      </div>
    </div>
  )
}
