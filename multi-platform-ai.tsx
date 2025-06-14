"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Check, Sparkles, Send } from "lucide-react"

export default function Component() {
  const [prompt, setPrompt] = useState("")
  const [selectedServices, setSelectedServices] = useState({
    chatgpt: true,
    deepseek: true,
    github: true,
    microsoft: true,
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const services = [
    { key: "chatgpt", name: "ChatGPT", color: "from-green-400 to-green-600" },
    { key: "deepseek", name: "DeepSeek", color: "from-purple-400 to-purple-600" },
    { key: "github", name: "GitHub Copilot", color: "from-gray-600 to-gray-800" },
    { key: "microsoft", name: "Microsoft Copilot", color: "from-blue-400 to-blue-600" },
  ]

  const toggleService = (serviceKey: string) => {
    setSelectedServices((prev) => ({
      ...prev,
      [serviceKey]: !prev[serviceKey],
    }))
  }

  const handleSubmit = () => {
    setIsSubmitted(true)
  }

  const completedCount = Object.values(selectedServices).filter(Boolean).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-chinese">
              多平台 AI
            </h1>
          </div>
          <p className="text-gray-600 text-lg font-medium font-chinese">一次提问，多个AI平台同时回答</p>
        </div>

        {/* Input Section */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 font-chinese">
                  输入您的问题或提示词
                </label>
                <Textarea
                  placeholder="请输入您想要询问的问题，支持多行输入..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[140px] border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 focus:ring-4 resize-none text-gray-700 placeholder:text-gray-400 rounded-xl text-base leading-relaxed transition-all duration-200 font-chinese"
                />
              </div>

              {/* Submit Button and Progress */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-chinese"
                >
                  <Send className="w-4 h-4" />
                  提交查询
                </Button>
                {isSubmitted && (
                  <div className="flex items-center gap-4 flex-1">
                    <Progress value={100} className="flex-1 h-3 bg-gray-200" />
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-green-50 px-3 py-1 rounded-full font-chinese">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {completedCount}/4 已完成
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 font-chinese">选择AI平台</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => (
              <button
                key={service.key}
                onClick={() => toggleService(service.key)}
                className={`relative p-4 rounded-2xl border-2 transition-all duration-200 group ${
                  selectedServices[service.key as keyof typeof selectedServices]
                    ? "border-transparent shadow-lg scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${service.color} opacity-0 transition-opacity duration-200 ${
                    selectedServices[service.key as keyof typeof selectedServices]
                      ? "opacity-100"
                      : "group-hover:opacity-10"
                  }`}
                />
                <div className="relative flex items-center justify-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                      selectedServices[service.key as keyof typeof selectedServices]
                        ? "border-white bg-white/20"
                        : "border-gray-400"
                    }`}
                  >
                    {selectedServices[service.key as keyof typeof selectedServices] && (
                      <Check className="w-3 h-3 text-white font-bold" />
                    )}
                  </div>
                  <span
                    className={`font-semibold transition-colors duration-200 ${
                      selectedServices[service.key as keyof typeof selectedServices] ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {service.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Response Cards */}
        {isSubmitted && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 font-chinese">AI 回复结果</h3>
            {services.map(
              (service) =>
                selectedServices[service.key as keyof typeof selectedServices] && (
                  <Card
                    key={service.key}
                    className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${service.color}`} />
                        <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                          {service.name}
                        </CardTitle>
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="min-h-[200px] pt-0">
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <p className="text-gray-700 leading-relaxed text-base font-chinese">
                          {service.name} 的回复：你输入的是 "{prompt}"
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
