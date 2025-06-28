"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, Heart, Smile, Frown, Meh } from "lucide-react"
import { useRouter } from "@/i18n/routing"

export default function PeriodRecordPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<string>("")
  const [pain, setPain] = useState<string>("")
  const [mood, setMood] = useState<string>("")
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const flowOptions = [
    { value: "light", label: "轻量", description: "少量出血" },
    { value: "medium", label: "中等", description: "正常流量" },
    { value: "heavy", label: "大量", description: "出血较多" }
  ]

  const painOptions = [
    { value: "none", label: "无疼痛", icon: <Smile className="h-4 w-4" /> },
    { value: "mild", label: "轻微疼痛", icon: <Meh className="h-4 w-4" /> },
    { value: "moderate", label: "中等疼痛", icon: <Frown className="h-4 w-4" /> },
    { value: "severe", label: "严重疼痛", icon: <Frown className="h-4 w-4" /> }
  ]

  const moodOptions = [
    { value: "good", label: "心情好", icon: <Smile className="h-4 w-4" /> },
    { value: "normal", label: "一般", icon: <Meh className="h-4 w-4" /> },
    { value: "bad", label: "心情差", icon: <Frown className="h-4 w-4" /> }
  ]

  const symptomOptions = [
    "腹痛", "腰痛", "乳房胀痛", "头痛", "疲劳", "情绪波动", 
    "食欲变化", "失眠", "便秘", "腹泻", "水肿", "痤疮"
  ]

  const handleSymptomToggle = (symptom: string) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter(s => s !== symptom))
    } else {
      setSymptoms([...symptoms, symptom])
    }
  }

  const handleSubmit = async () => {
    if (!flow) {
      alert("请选择流量强度")
      return
    }

    setIsSubmitting(true)
    
    try {
      // 这里将来会保存到IndexedDB
      const record = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        type: "period",
        flow,
        pain,
        mood,
        symptoms,
        notes: notes.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      console.log("保存例假记录:", record)
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      router.push("/healthcalendar")
    } catch (error) {
      console.error("保存失败:", error)
      alert("保存失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">例假记录</h1>
              <p className="text-sm text-gray-600">记录今天的例假状况</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 流量强度 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <span>流量强度</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={flow} onValueChange={setFlow}>
              <SelectTrigger>
                <SelectValue placeholder="选择流量强度" />
              </SelectTrigger>
              <SelectContent>
                {flowOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 疼痛程度 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>疼痛程度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {painOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPain(option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    pain === option.value
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 心情状态 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>心情状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {moodOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setMood(option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    mood === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 症状选择 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>症状</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map(symptom => (
                <Badge
                  key={symptom}
                  variant={symptoms.includes(symptom) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    symptoms.includes(symptom)
                      ? "bg-red-600 hover:bg-red-700"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 备注 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="记录其他感受或注意事项..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !flow}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "保存中..." : "保存记录"}
          </Button>
        </div>
      </div>
    </div>
  )
} 