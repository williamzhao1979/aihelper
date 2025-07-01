"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, Heart, Smile, Frown, Meh } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { useUserManagement } from "@/hooks/use-user-management"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateString, getLocalDateTimeString } from "@/lib/utils"
import InlineUserSelector, { type UserProfile } from "@/components/healthcalendar/shared/inline-user-selector"

export default function PeriodRecordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { saveRecord, isInitialized } = useHealthDatabase()
  const { getPrimaryUser, users: availableUsers } = useUserManagement()
  
  const [recordDateTime, setRecordDateTime] = useState<string>(getLocalDateTimeString())
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
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
    "食欲变化", "失眠", "便秘", "腹泻", "水肿", "痤疮",
    "开始", "结束", "基本结束", "少量", "中等", "大量"
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
      toast({
        title: "验证失败",
        description: "请选择流量强度",
        variant: "destructive",
      })
      return
    }

    if (!selectedUser) {
      toast({
        title: "验证失败",
        description: "请选择一个用户",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // 准备记录数据
      const recordData = {
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: recordDateTime,
        type: "period" as const,
        flow,
        pain,
        mood,
        symptoms,
        notes: notes.trim(),
        // 多用户字段
        uniqueOwnerId: selectedUser.uniqueOwnerId,
        ownerId: selectedUser.ownerId,
        ownerName: selectedUser.ownerName
      }

      const recordId = await saveRecord(recordData)
      
      console.log("例假记录保存成功:", recordId)
      toast({
        title: "保存成功",
        description: `已为 ${selectedUser.nickname} 保存例假记录`,
      })
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 1000)
      
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: "保存记录时发生错误，请重试",
        variant: "destructive",
      })
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
        {/* 用户选择器 - 内联在页面头部 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <InlineUserSelector
              selectedUser={selectedUser}
              onUserChange={setSelectedUser}
              availableUsers={availableUsers}
              recordType="period"
            />
          </CardContent>
        </Card>

        {/* 日期时间 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle>日期时间</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3">
              <Input
                id="record-datetime"
                type="datetime-local"
                value={recordDateTime}
                onChange={(e) => setRecordDateTime(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>


        {/* 症状选择 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>身体感觉</CardTitle>
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
            disabled={isSubmitting || !flow || !selectedUser}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "保存中..." : "保存记录"}
          </Button>
        </div>
      </div>
    </div>
  )
} 