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
import {
  Check,
  Sparkles,
  Send,
  AlertCircle,
  Loader2,
  Zap,
  Lock,
  Clock,
  Settings,
  Languages,
  RotateCcw,
  X,
  Rocket,
  Brain,
  Copy,
  Download,
  Bookmark,
  History,
} from "lucide-react"
import LanguageSwitcher from "./language-switcher"
import VersionSelector from "./version-selector"
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
  favorite?: boolean
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
  icon: string
}

type ResponseMode = "standard" | "async" | "streaming" | "turbo"

interface MultiPlatformAIV3Props {
  version?: string
  onVersionChange?: (version: string) => void
}

export default function MultiPlatformAIV3({ version, onVersionChange }: MultiPlatformAIV3Props) {
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
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // V3 新增功能状态
  const [autoSave, setAutoSave] = useState(true)
  const [smartSuggestions, setSmartSuggestions] = useState(true)
  const [comparisonMode, setComparisonMode] = useState(false)

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
    { key: "chatgpt", name: t("services.chatgpt"), color: "from-green-400 to-green-600", icon: "🤖" },
    { key: "deepseek", name: t("services.deepseek"), color: "from-purple-400 to-purple-600", icon: "🧠" },
    { key: "github", name: t("services.github"), color: "from-gray-600 to-gray-800", icon: "💻" },
    { key: "microsoft", name: t("services.microsoft"), color: "from-blue-400 to-blue-600", icon: "🔷" },
  ]

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (session?.user) {
      checkSubscriptionStatus()
    }
  }, [session])

  useEffect(() => {
    setIsMounted(true)
    // V3: 加载保存的设置
    loadUserSettings()
  }, [])

  // V3: 加载用户设置
  const loadUserSettings = () => {
    try {
      const savedSettings = localStorage.getItem("aihelper-v3-settings")
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setAutoSave(settings.autoSave ?? true)
        setSmartSuggestions(settings.smartSuggestions ?? true)
        setComparisonMode(settings.comparisonMode ?? false)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  // V3: 保存用户设置
  const saveUserSettings = () => {
    try {
      const settings = {
        autoSave,
        smartSuggestions,
        comparisonMode,
      }
      localStorage.setItem("aihelper-v3-settings", JSON.stringify(settings))
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  useEffect(() => {
    saveUserSettings()
  }, [autoSave, smartSuggestions, comparisonMode])

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (
        showSettings &&
        !target.closest(".settings-card") &&
        !target.closest(".settings-button") &&
        !target.closest("[data-radix-popper-content-wrapper]")
      ) {
        setShowSettings(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showSettings])

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
    if ((mode === "streaming" || mode === "turbo") && !session) {
      signIn()
      return
    }

    if ((mode === "streaming" || mode === "turbo") && !hasActiveSubscription) {
      // Don't change mode, let the subscription dialog handle it
      return
    }

    setResponseMode(mode)
  }

  // V3: 复制响应内容
  const copyResponse = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      // 可以添加toast通知
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  // V3: 收藏/取消收藏
  const toggleFavorite = (resultId: string) => {
    setChatResults((prev) =>
      prev.map((result) => (result.id === resultId ? { ...result, favorite: !result.favorite } : result)),
    )
  }

  // V3: 导出结果
  const exportResults = (result: ChatResult) => {
    const exportData = {
      prompt: result.prompt,
      timestamp: new Date(result.timestamp).toISOString(),
      mode: result.mode,
      responses: result.responses,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `aihelper-result-${result.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  // V3: Turbo模式处理
  const handleTurboSubmit = async () => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError(t("chat.noServiceSelected"))
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
          turbo: true, // V3新增turbo模式
        }),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("chat.apiError"))
      }

      if (data.success) {
        const newResult: ChatResult = {
          id: generateId(),
          prompt: prompt.trim(),
          selectedServices: { ...selectedServices },
          responses: data.results,
          timestamp: Date.now(),
          mode: "turbo",
        }
        setChatResults((prev) => [...prev, newResult])
        setLastSubmittedPrompt(prompt.trim())
        setLastSubmittedServices({ ...selectedServices })
      } else {
        throw new Error(data.error || t("chat.serverError"))
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(t("chat.networkError"))
      } else {
        setError(err instanceof Error ? err.message : t("chat.serverError"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreamingSubmit = async () => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError(t("chat.noServiceSelected"))
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
              setChatResults((prev) => [...prev, newResult])
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
        setError(t("chat.networkError"))
      } else {
        setError(err instanceof Error ? err.message : t("chat.serverError"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStandardSubmit = async () => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError(t("chat.noServiceSelected"))
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
        throw new Error(data.error || t("chat.apiError"))
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
        setChatResults((prev) => [...prev, newResult])
        setLastSubmittedPrompt(prompt.trim())
        setLastSubmittedServices({ ...selectedServices })
      } else {
        throw new Error(data.error || t("chat.serverError"))
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(t("chat.networkError"))
      } else {
        setError(err instanceof Error ? err.message : t("chat.serverError"))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsyncSubmit = async (forceSubmit = false) => {
    if (!prompt.trim()) return

    const selectedCount = Object.values(selectedServices).filter(Boolean).length
    if (selectedCount === 0) {
      setError(t("chat.noServiceSelected"))
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
        throw new Error(data.error || t("chat.apiError"))
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
        setChatResults((prev) => [...prev, newResult])
      } else {
        throw new Error(data.error || t("chat.serverError"))
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(t("chat.networkError"))
      } else {
        setError(err instanceof Error ? err.message : t("chat.serverError"))
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
      case "turbo":
        handleTurboSubmit()
        break
    }
  }

  const handleDuplicateConfirm = () => {
    setShowDuplicateDialog(false)
    handleAsyncSubmit(true)
  }

  const selectedCount = Object.values(selectedServices).filter(Boolean).length
  const completedCount = responseMode === "streaming" ? streamingResponses.size : 0
  const canUseAdvanced = session && hasActiveSubscription

  // 检查是否正在处理请求
  const isProcessing = isLoading || processingRequests.size > 0

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : "en-US", {
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
          <span>{t("common.loading")}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl pb-96">
        {/* Header */}
        <div className="hidden text-center mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1" />
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg animate-pulse">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t("header.title")}
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Rocket className="w-3 h-3" />
                    V3 极速版
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-end relative gap-2">
              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white/90 transition-all duration-200 shadow-sm"
              >
                <History className="w-5 h-5 text-gray-600" />
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="settings-button p-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white/90 transition-all duration-200 shadow-sm"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* Settings Card */}
              {showSettings && (
                <div className="settings-card absolute top-12 right-0 w-96 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl z-50 p-6">
                  <div className="space-y-6">
                    {/* Settings Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-800">{t("settings.title")}</h3>
                      </div>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    {/* V3 新增设置 */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        智能功能
                      </h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">自动保存对话</span>
                          <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                            className="rounded"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">智能建议</span>
                          <input
                            type="checkbox"
                            checked={smartSuggestions}
                            onChange={(e) => setSmartSuggestions(e.target.checked)}
                            className="rounded"
                          />
                        </label>

                        <label className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">对比模式</span>
                          <input
                            type="checkbox"
                            checked={comparisonMode}
                            onChange={(e) => setComparisonMode(e.target.checked)}
                            className="rounded"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Version Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-700">{t("settings.version")}</span>
                      </div>
                      <VersionSelector
                        currentVersion={version || "v3"}
                        onVersionChange={onVersionChange || (() => {})}
                      />
                    </div>

                    {/* Language Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-700">{t("settings.language")}</span>
                      </div>
                      <LanguageSwitcher />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium">{t("chat.subtitle")} - 极速智能版</p>
        </div>

        {/* AI回答结果 - 永久显示 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">{t("chat.resultsTitle")}</h3>
            {chatResults.length > 0 && (
              <button
                onClick={() => {
                  const element = document.querySelector("[data-latest-result]")
                  element?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                查看最新结果
              </button>
            )}
          </div>

          {/* 当前流式响应 */}
          {responseMode === "streaming" && streamingResponses.size > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-500" />
                <span className="text-lg font-semibold text-gray-700">{t("chat.realtimeStreaming")}</span>
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
                          {service?.icon} {serviceName}
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
                        <div className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                          {content || t("results.streaming")}
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
              {chatResults
                .slice()
                .reverse() // 反转数组，让最新的结果显示在最前面
                .map((result, resultIndex) => (
                  <div
                    key={result.id}
                    className="space-y-4"
                    {...(resultIndex === 0 ? { "data-latest-result": true } : {})}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        {result.mode === "turbo" ? (
                          <Rocket className="w-5 h-5 text-pink-500" />
                        ) : result.mode === "streaming" ? (
                          <Zap className="w-5 h-5 text-purple-500" />
                        ) : result.mode === "async" ? (
                          <Sparkles className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <Send className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="text-lg font-semibold text-gray-700">
                          {result.mode === "turbo"
                            ? "极速模式"
                            : result.mode === "streaming"
                              ? t("chat.streamingMode")
                              : result.mode === "async"
                                ? t("chat.asyncMode")
                                : t("chat.standardMode")}
                        </span>
                        {/* 添加"最新"标识给第一个结果 */}
                        {resultIndex === 0 && (
                          <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            最新
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(result.timestamp)}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(result.id)}
                          className={`p-1 rounded-md transition-colors ${
                            result.favorite ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"
                          }`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => exportResults(result)}
                          className="p-1 rounded-md text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="text-sm text-gray-600 mb-2">{t("chat.questionContent")}</div>
                      <div className="text-gray-800">{result.prompt}</div>
                    </div>

                    <div className={`grid gap-4 ${comparisonMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                      {result.responses.map((aiResponse, index) => {
                        const service = services.find((s) => s.name === aiResponse.service)
                        return (
                          <Card
                            key={`${result.id}-${aiResponse.service}-${index}`}
                            className={`border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group ${
                              resultIndex === 0 ? "ring-2 ring-green-200 ring-opacity-50" : ""
                            }`}
                          >
                            <CardHeader className="pb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-3 h-3 rounded-full bg-gradient-to-r ${service?.color || "from-gray-400 to-gray-600"}`}
                                />
                                <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                                  {service?.icon} {aiResponse.service}
                                </CardTitle>
                                <div className="ml-auto flex items-center gap-2">
                                  <button
                                    onClick={() => copyResponse(aiResponse.response)}
                                    className="p-1 rounded-md text-gray-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
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
                                    <span>
                                      {t("chat.errorPrefix")}
                                      {aiResponse.error}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
                                    {aiResponse.response || t("chat.noResponse")}
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
              <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{t("chat.noResults")}</p>
            </div>
          )}
        </div>
      </div>

      {/* 浮动输入区域 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-2xl z-40">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* 输入框 */}
                <div>
                  <Textarea
                    placeholder={t("chat.inputPlaceholder")}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[100px] border-2 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 resize-none text-gray-700 placeholder:text-gray-400 rounded-xl text-base leading-relaxed transition-all duration-200 disabled:opacity-50"
                  />
                </div>

                {/* 控制按钮区域 */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* 响应模式选择 */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                    <button
                      onClick={() => handleResponseModeChange("standard")}
                      disabled={isLoading}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        responseMode === "standard"
                          ? "bg-blue-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("chat.standardMode")}
                    </button>
                    <button
                      onClick={() => handleResponseModeChange("async")}
                      disabled={isLoading}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        responseMode === "async"
                          ? "bg-indigo-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {t("chat.asyncMode")}
                    </button>
                    <button
                      onClick={() => handleResponseModeChange("streaming")}
                      disabled={isLoading || !canUseAdvanced}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        responseMode === "streaming"
                          ? "bg-purple-500 text-white shadow-md"
                          : canUseAdvanced
                            ? "text-gray-600 hover:bg-gray-100"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {t("chat.streamingMode")}
                      {!canUseAdvanced && <Lock className="w-3 h-3 ml-1 inline" />}
                    </button>
                    <button
                      onClick={() => handleResponseModeChange("turbo")}
                      disabled={isLoading || !canUseAdvanced}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        responseMode === "turbo"
                          ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-md"
                          : canUseAdvanced
                            ? "text-gray-600 hover:bg-gray-100"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Rocket className="w-3 h-3 mr-1 inline" />
                      极速模式
                      {!canUseAdvanced && <Lock className="w-3 h-3 ml-1 inline" />}
                    </button>
                  </div>
                  {/* 状态显示 */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* 异步处理状态显示 */}
                    {processingRequests.size > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 px-3 py-1 rounded-full bg-indigo-50">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        {t("chat.processing")}: {processingRequests.size}
                      </div>
                    )}

                    {/* 流式响应进度 */}
                    {isLoading && responseMode === "streaming" && (
                      <div className="flex items-center gap-4 flex-1">
                        <Progress value={(completedCount / selectedCount) * 100} className="flex-1 h-2 bg-gray-200" />
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 px-3 py-1 rounded-full bg-purple-50">
                          <div className="w-2 h-2 rounded-full animate-pulse bg-purple-500"></div>
                          {completedCount}/{selectedCount} {t("chat.completed")}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {/* 提交按钮 */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isLoading || selectedCount === 0}
                    className={`px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      responseMode === "turbo"
                        ? "bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
                        : responseMode === "streaming"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          : responseMode === "async"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    } text-white`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : responseMode === "turbo" ? (
                      <Rocket className="w-4 h-4" />
                    ) : responseMode === "streaming" ? (
                      <Zap className="w-4 h-4" />
                    ) : responseMode === "async" ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isLoading ? t("chat.submitting") : t("chat.submitButton")}
                  </Button>
                </div>

                {/* 服务选择 */}
                <div className="hidden grid grid-cols-2 md:grid-cols-4 gap-3">
                  {services.map((service) => (
                    <button
                      key={service.key}
                      onClick={() => toggleService(service.key)}
                      disabled={isLoading}
                      className={`relative p-3 rounded-xl border-2 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedServices[service.key]
                          ? "border-transparent shadow-lg scale-105"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      <div
                        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${service.color} opacity-0 transition-opacity duration-200 ${
                          selectedServices[service.key] ? "opacity-100" : "group-hover:opacity-10"
                        }`}
                      />
                      <div className="relative flex items-center justify-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                            selectedServices[service.key] ? "border-white bg-white/20" : "border-gray-400"
                          }`}
                        >
                          {selectedServices[service.key] && <Check className="w-2.5 h-2.5 text-white font-bold" />}
                        </div>
                        <span
                          className={`text-sm font-semibold transition-colors duration-200 ${
                            selectedServices[service.key] ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {service.icon} {service.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 重复提交确认对话框 */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chat.duplicateDetection")}</DialogTitle>
            <DialogDescription>{t("chat.duplicateMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleDuplicateConfirm} className="bg-indigo-600 hover:bg-indigo-700">
              {t("chat.yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
