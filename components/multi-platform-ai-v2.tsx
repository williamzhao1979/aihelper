"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Sparkles, Send, AlertCircle, Loader2, Zap, Crown, Lock, Star, Clock } from "lucide-react"
import LanguageSwitcher from "./language-switcher"
import SubscriptionDialog from "./subscription-dialog"
import Link from "next/link"
import { useLocale } from "next-intl"

interface AIResponse {
  service: string
  response: string
  error?: string
  timestamp: number
}

interface StreamingResponse {
  service: string
  content: string
  done: boolean
  error?: string
  timestamp: number
}

interface ApiResponse {
  success: boolean
  results: AIResponse[]
  timestamp: number
  error?: string
}

interface ChatResult {
  id: string
  prompt: string
  selectedServices: SelectedServices
  responses: AIResponse[]
  timestamp: number
  mode: ResponseMode
}

// Define the service keys type
type ServiceKey = "chatgpt" | "deepseek" | "github" | "microsoft"

interface SelectedServices {
  chatgpt: boolean
  deepseek: boolean
  github: boolean
  microsoft: boolean
}

interface Service {
  key: ServiceKey
  name: string
  color: string
}

type ResponseMode = "standard" | "async" | "streaming"

export default function MultiPlatformAIV2() {
  const t = useTranslations()
  const { data: session, status } = useSession()
  const locale = useLocale()

  const [prompt, setPrompt] = useState("")
  const [selectedServices, setSelectedServices] = useState<SelectedServices>({
    chatgpt: true,
    deepseek: true,
    github: false,
    microsoft: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [chatResults, setChatResults] = useState<ChatResult[]>([])
  const [streamingResponses, setStreamingResponses] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(false)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [responseMode, setResponseMode] = useState<ResponseMode>("async")

  // 重复检测相关状态
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState<string>("")
  const [lastSubmittedServices, setLastSubmittedServices] = useState<SelectedServices>({
    chatgpt: false,
    deepseek: false,
    github: false,
    microsoft: false,
  })
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())

  const services: Service[] = [
    { key: "chatgpt", name: "ChatGPT", color: "from-green-400 to-green-600" },
    { key: "deepseek", name: "DeepSeek", color: "from-purple-400 to-purple-600" },
    { key: "github", name: "GitHub Copilot", color: "from-gray-600 to-gray-800" },
    { key: "microsoft", name: "Microsoft Copilot", color: "from-blue-400 to-blue-600" },
  ]

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (session?.user) {
      checkSubscriptionStatus()
    }
  }, [session])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const checkSubscriptionStatus = async () => {
    setCheckingSubscription(true)
    try {
      const response = await fetch("/api/subscription/status")
      const data = await response.json()
      setHasActiveSubscription(data.hasActiveSubscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    } finally {
      setCheckingSubscription(false)
    }
  }

  const toggleService = (serviceKey: ServiceKey) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceKey]: !prev[serviceKey],
    }))
  }

  const handleResponseModeChange = (mode: ResponseMode) => {
    if (mode === "streaming" && !session) {
      signIn()
      return
    }

    if (mode === "streaming" && !hasActiveSubscription) {
      // Don't change mode, let the subscription dialog handle it
      return
    }

    setResponseMode(mode)
  }

  // 检查是否为重复提交
  const isDuplicateSubmission = () => {
    if (!lastSubmittedPrompt) return false

    const currentPrompt = prompt.trim()
    const promptSame = lastSubmittedPrompt === currentPrompt

    // 检查服务选择是否完全相同
    const servicesKeys: ServiceKey[] = ["chatgpt", "deepseek", "github", "microsoft"]
    const servicesSame = servicesKeys.every((key) => selectedServices[key] === lastSubmittedServices[key])

    return promptSame && servicesSame
  }

  // 生成唯一ID
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const handleStreamingSubmit = async () => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError("请至少选择一个AI服务")
      return
    }

    setIsLoading(true)
    setError(null)
    setStreamingResponses(new Map())

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selectedServices,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ""
      const completedServices = new Set<string>()
      const streamingResults: AIResponse[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") {
              // 保存流式响应结果到历史记录
              const newResult: ChatResult = {
                id: generateId(),
                prompt: prompt.trim(),
                selectedServices: { ...selectedServices },
                responses: streamingResults,
                timestamp: Date.now(),
                mode: "streaming",
              }
              setChatResults((prev) => [newResult, ...prev])
              setLastSubmittedPrompt(prompt.trim())
              setLastSubmittedServices({ ...selectedServices })
              setIsLoading(false)
              return
            }

            try {
              const streamData: StreamingResponse = JSON.parse(data)

              if (streamData.error) {
                setStreamingResponses((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(streamData.service, `Error: ${streamData.error}`)
                  return newMap
                })
                streamingResults.push({
                  service: streamData.service,
                  response: "",
                  error: streamData.error,
                  timestamp: streamData.timestamp,
                })
                completedServices.add(streamData.service)
              } else if (streamData.done) {
                const finalContent = streamingResponses.get(streamData.service) || ""
                streamingResults.push({
                  service: streamData.service,
                  response: finalContent,
                  timestamp: streamData.timestamp,
                })
                completedServices.add(streamData.service)
              } else if (streamData.content) {
                setStreamingResponses((prev) => {
                  const newMap = new Map(prev)
                  const currentContent = newMap.get(streamData.service) || ""
                  newMap.set(streamData.service, currentContent + streamData.content)
                  return newMap
                })
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e)
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request cancelled")
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("网络错误，请检查网络连接")
      } else {
        setError(err instanceof Error ? err.message : "服务器错误")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStandardSubmit = async () => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError("请至少选择一个AI服务")
      return
    }

    setIsLoading(true)
    setError(null)
    setStreamingResponses(new Map())

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selectedServices,
        }),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "API错误")
      }

      if (data.success) {
        const newResult: ChatResult = {
          id: generateId(),
          prompt: prompt.trim(),
          selectedServices: { ...selectedServices },
          responses: data.results,
          timestamp: Date.now(),
          mode: "standard",
        }
        setChatResults((prev) => [newResult, ...prev])
        setLastSubmittedPrompt(prompt.trim())
        setLastSubmittedServices({ ...selectedServices })
      } else {
        throw new Error(data.error || "服务器错误")
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("网络错误，请检查网络连接")
      } else {
        setError(err instanceof Error ? err.message : "服务器错误")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsyncSubmit = async (forceSubmit = false) => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError("请至少选择一个AI服务")
      return
    }

    // 检查重复提交
    if (!forceSubmit && isDuplicateSubmission()) {
      setShowDuplicateDialog(true)
      return
    }

    const requestId = generateId()
    setProcessingRequests((prev) => new Set([...prev, requestId]))
    setError(null)

    // 立即更新最后提交的内容，防止快速重复点击
    setLastSubmittedPrompt(prompt.trim())
    setLastSubmittedServices({ ...selectedServices })

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selectedServices,
          async: true,
        }),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "API错误")
      }

      if (data.success) {
        const newResult: ChatResult = {
          id: requestId,
          prompt: prompt.trim(),
          selectedServices: { ...selectedServices },
          responses: data.results,
          timestamp: Date.now(),
          mode: "async",
        }
        setChatResults((prev) => [newResult, ...prev])
      } else {
        throw new Error(data.error || "服务器错误")
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("网络错误，请检查网络连接")
      } else {
        setError(err instanceof Error ? err.message : "服务器错误")
      }
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleSubmit = () => {
    switch (responseMode) {
      case "standard":
        handleStandardSubmit()
        break
      case "async":
        handleAsyncSubmit()
        break
      case "streaming":
        handleStreamingSubmit()
        break
    }
  }

  const handleDuplicateConfirm = () => {
    setShowDuplicateDialog(false)
    handleAsyncSubmit(true)
  }

  const selectedCount = Object.values(selectedServices).filter(Boolean).length
  const completedCount = responseMode === "streaming" ? streamingResponses.size : 0
  const canUseStreaming = session && hasActiveSubscription

  // 检查是否正在处理请求
  const isProcessing = isLoading || processingRequests.size > 0

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Don't render until mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1" />
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="flex flex-col items-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-chinese">
                  多平台 AI
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    增强版 v2
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <LanguageSwitcher />
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium font-chinese">一次提问，多个AI平台同时回答 - 增强体验版</p>
        </div>

        {/* Input Section */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 font-chinese">输入您的问题</label>
                <Textarea
                  placeholder="请输入您想要询问的问题..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                  className="min-h-[140px] border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 resize-none text-gray-700 placeholder:text-gray-400 rounded-xl text-base leading-relaxed transition-all duration-200 font-chinese disabled:opacity-50"
                />
              </div>

              {/* Response Mode Selection */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {responseMode === "streaming" ? (
                      <Zap className="w-5 h-5 text-purple-600" />
                    ) : responseMode === "async" ? (
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Send className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 font-chinese">
                          {responseMode === "streaming"
                            ? "流式响应"
                            : responseMode === "async"
                              ? "异步并行"
                              : "标准响应"}
                        </span>
                        {responseMode === "streaming" && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                            <Crown className="w-3 h-3" />
                            <span>专业功能</span>
                          </div>
                        )}
                        {responseMode === "async" && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full">
                            <Sparkles className="w-3 h-3" />
                            <span>推荐</span>
                          </div>
                        )}
                        {!canUseStreaming && responseMode === "streaming" && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>需要订阅</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-chinese">
                        {responseMode === "streaming"
                          ? "实时显示AI回答过程"
                          : responseMode === "async"
                            ? "无需等待，AI并行处理，支持重复检测"
                            : "等待所有AI完成后显示结果"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!canUseStreaming && responseMode === "streaming" && (
                    <SubscriptionDialog>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        <Crown className="w-4 h-4 mr-1" />
                        升级
                      </Button>
                    </SubscriptionDialog>
                  )}
                </div>
              </div>

              {/* Submit Button and Progress */}
              <div className="flex items-center gap-4">
                {/* Response Mode Selection */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                  <button
                    onClick={() => handleResponseModeChange("standard")}
                    disabled={isProcessing}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      responseMode === "standard"
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    标准
                  </button>
                  <button
                    onClick={() => handleResponseModeChange("async")}
                    disabled={isProcessing}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      responseMode === "async"
                        ? "bg-indigo-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    异步并行
                  </button>
                  <button
                    onClick={() => handleResponseModeChange("streaming")}
                    disabled={isProcessing || !canUseStreaming}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      responseMode === "streaming"
                        ? "bg-purple-500 text-white shadow-md"
                        : canUseStreaming
                          ? "text-gray-600 hover:bg-gray-100"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    流式响应
                    {!canUseStreaming && <Lock className="w-3 h-3 ml-1 inline" />}
                  </button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isProcessing || selectedCount === 0}
                  className={`px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-chinese ${
                    responseMode === "streaming"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : responseMode === "async"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  } text-white`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : responseMode === "streaming" ? (
                    <Zap className="w-4 h-4" />
                  ) : responseMode === "async" ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isProcessing ? "处理中..." : "提交问题"}
                </Button>

                {/* 异步处理状态显示 */}
                {processingRequests.size > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 px-3 py-1 rounded-full bg-indigo-50 font-chinese">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    处理中: {processingRequests.size}
                  </div>
                )}

                {isLoading && responseMode === "streaming" && (
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={(completedCount / selectedCount) * 100} className="flex-1 h-3 bg-gray-200" />
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 px-3 py-1 rounded-full font-chinese bg-purple-50">
                      <div className="w-2 h-2 rounded-full animate-pulse bg-purple-500"></div>
                      {completedCount}/{selectedCount} 已完成
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-chinese">{error}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 font-chinese">选择AI服务</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => (
              <button
                key={service.key}
                onClick={() => toggleService(service.key)}
                disabled={isProcessing}
                className={`relative p-4 rounded-2xl border-2 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedServices[service.key]
                    ? "border-transparent shadow-lg scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} opacity-0 transition-opacity duration-200 ${
                    selectedServices[service.key] ? "opacity-100" : "group-hover:opacity-10"
                  }`}
                />
                <div className="relative flex items-center justify-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                      selectedServices[service.key] ? "border-white bg-white/20" : "border-gray-400"
                    }`}
                  >
                    {selectedServices[service.key] && <Check className="w-3 h-3 text-white font-bold" />}
                  </div>
                  <span
                    className={`font-semibold transition-colors duration-200 ${
                      selectedServices[service.key] ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {service.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI回答结果 - 永久显示 */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 font-chinese">AI回答结果</h3>

          {/* 当前流式响应 */}
          {responseMode === "streaming" && streamingResponses.size > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="text-lg font-semibold text-gray-700 font-chinese">实时流式响应</span>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
              {Array.from(streamingResponses.entries()).map(([serviceName, content]) => {
                const service = services.find((s) => s.name === serviceName)
                return (
                  <Card
                    key={`streaming-${serviceName}`}
                    className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full bg-gradient-to-r ${service?.color || "from-gray-400 to-gray-600"}`}
                        />
                        <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                          {serviceName}
                        </CardTitle>
                        <div className="ml-auto flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-500" />
                          {isLoading ? (
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="min-h-[200px] pt-0">
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                        <div className="text-gray-700 leading-relaxed text-base font-chinese whitespace-pre-wrap">
                          {content || "正在流式回答中..."}
                          {isLoading && <span className="animate-pulse">|</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* 历史结果 */}
          {chatResults.length > 0 && (
            <div className="space-y-6">
              {chatResults.map((result, resultIndex) => (
                <div key={result.id} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      {result.mode === "streaming" ? (
                        <Zap className="w-5 h-5 text-purple-500" />
                      ) : result.mode === "async" ? (
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Send className="w-5 h-5 text-blue-500" />
                      )}
                      <span className="text-lg font-semibold text-gray-700 font-chinese">
                        {result.mode === "streaming" ? "流式响应" : result.mode === "async" ? "异步并行" : "标准响应"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(result.timestamp)}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600 mb-2 font-chinese">提问内容：</div>
                    <div className="text-gray-800 font-chinese">{result.prompt}</div>
                  </div>

                  <div className="grid gap-4">
                    {result.responses.map((aiResponse, index) => {
                      const service = services.find((s) => s.name === aiResponse.service)
                      return (
                        <Card
                          key={`${result.id}-${aiResponse.service}-${index}`}
                          className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group"
                        >
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${service?.color || "from-gray-400 to-gray-600"}`}
                              />
                              <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                                {aiResponse.service}
                              </CardTitle>
                              <div className="ml-auto">
                                {aiResponse.error ? (
                                  <AlertCircle className="w-5 h-5 text-red-500" />
                                ) : (
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="min-h-[200px] pt-0">
                            <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-6 border border-purple-100">
                              {aiResponse.error ? (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="font-chinese">错误: {aiResponse.error}</span>
                                </div>
                              ) : (
                                <div className="text-gray-700 leading-relaxed text-base font-chinese whitespace-pre-wrap">
                                  {aiResponse.response || "暂无回答"}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {chatResults.length === 0 && streamingResponses.size === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-chinese">还没有AI回答结果，请提交问题开始对话</p>
            </div>
          )}
        </div>

        {/* Link to Text Review Page */}
        <Card className="mt-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold font-chinese">更多功能</span>
            </div>
            <p className="text-gray-600 mb-4 font-chinese">图像文字识别和修改建议</p>
            <div className="flex gap-4 justify-center">
              <Link href={`/${locale}/textreview`}>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-chinese">
                  前往AI文章助手
                </Button>
              </Link>
              <Link href={`/${locale}/artreview`}>
                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-chinese">
                  前往AI绘画评价
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Status */}
        {status === "loading" ? (
          <Card className="mt-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>检查登录状态...</span>
            </CardContent>
          </Card>
        ) : !session ? (
          <Card className="mt-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-gray-500" />
                <span className="text-lg font-semibold">登录以使用完整功能</span>
              </div>
              <p className="text-gray-600 mb-4">登录后可使用流式响应等专业功能</p>
              <Button onClick={() => signIn()} className="bg-blue-600 hover:bg-blue-700">
                立即登录
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* 重复提交确认对话框 */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-chinese">相同问题检测</DialogTitle>
              <DialogDescription className="font-chinese">相同问题，是否再次提问？</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} className="font-chinese">
                取消
              </Button>
              <Button onClick={handleDuplicateConfirm} className="bg-indigo-600 hover:bg-indigo-700 font-chinese">
                是
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
