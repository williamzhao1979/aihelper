"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Heart, Activity } from "lucide-react"
import { useRouter } from "@/i18n/routing"

interface HealthRecord {
  id: string
  date: string
  type: "period" | "symptom" | "checkup" | "observation"
  content: string
  tags?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
  }>
  flow?: string
  pain?: string
  mood?: string
  symptoms?: string[]
  createdAt: Date
  updatedAt: Date
}

interface PageProps {
  params: Promise<{ date: string }>
}

export default function HealthRecordViewPage({ params }: PageProps) {
  const router = useRouter()
  const [date, setDate] = useState<string>("")
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { date: dateParam } = await params
      setDate(dateParam)
      
      // 模拟加载数据
      const mockRecords: HealthRecord[] = [
        {
          id: "1",
          date: dateParam,
          type: "period",
          content: "例假记录",
          flow: "medium",
          pain: "mild",
          mood: "normal",
          symptoms: ["腹痛", "疲劳"],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "2",
          date: dateParam,
          type: "symptom",
          content: "今天后腰两侧疼，有腰肌劳损的症状，可能是久坐8个小时导致的",
          tags: ["腰痛", "久坐"],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
      
      setRecords(mockRecords)
      setIsLoading(false)
    }
    
    loadData()
  }, [params])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getTypeLabel = (type: string) => {
    const typeMap = {
      period: "例假记录",
      symptom: "身体不适",
      checkup: "体检报告",
      observation: "日常观察"
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const getTypeColor = (type: string) => {
    const colorMap = {
      period: "bg-red-100 text-red-800",
      symptom: "bg-blue-100 text-blue-800",
      checkup: "bg-green-100 text-green-800",
      observation: "bg-yellow-100 text-yellow-800"
    }
    return colorMap[type as keyof typeof colorMap] || "bg-gray-100 text-gray-800"
  }

  const getFlowLabel = (flow: string) => {
    const flowMap = {
      light: "轻量",
      medium: "中等",
      heavy: "大量"
    }
    return flowMap[flow as keyof typeof flowMap] || flow
  }

  const getPainLabel = (pain: string) => {
    const painMap = {
      none: "无疼痛",
      mild: "轻微疼痛",
      moderate: "中等疼痛",
      severe: "严重疼痛"
    }
    return painMap[pain as keyof typeof painMap] || pain
  }

  const getMoodLabel = (mood: string) => {
    const moodMap = {
      good: "心情好",
      normal: "一般",
      bad: "心情差"
    }
    return moodMap[mood as keyof typeof moodMap] || mood
  }

  const handleAddRecord = () => {
    router.push("/healthcalendar/record")
  }

  const handleEditRecord = (recordId: string) => {
    // 这里将来会跳转到编辑页面
    console.log("编辑记录:", recordId)
  }

  const handleDeleteRecord = (recordId: string) => {
    if (confirm("确定要删除这条记录吗？")) {
      setRecords(records.filter(record => record.id !== recordId))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formatDate(date)}</h1>
              <p className="text-sm text-gray-600">健康记录详情</p>
            </div>
          </div>
          <Button
            onClick={handleAddRecord}
            className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            <span>添加记录</span>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {records.length === 0 ? (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
              <p className="text-gray-600 mb-4">这一天还没有健康记录</p>
              <Button onClick={handleAddRecord} className="bg-red-600 hover:bg-red-700">
                添加第一条记录
              </Button>
            </CardContent>
          </Card>
        ) : (
          records.map(record => (
            <Card key={record.id} className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge className={getTypeColor(record.type)}>
                      {getTypeLabel(record.type)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRecord(record.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 记录内容 */}
                <div>
                  <p className="text-gray-900 whitespace-pre-wrap">{record.content}</p>
                </div>

                {/* 例假记录特殊字段 */}
                {record.type === "period" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-red-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">流量强度</label>
                      <p className="text-sm text-gray-900">{getFlowLabel(record.flow || "")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">疼痛程度</label>
                      <p className="text-sm text-gray-900">{getPainLabel(record.pain || "")}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">心情状态</label>
                      <p className="text-sm text-gray-900">{getMoodLabel(record.mood || "")}</p>
                    </div>
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">症状</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.symptoms.map(symptom => (
                            <Badge key={symptom} variant="secondary" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 标签 */}
                {record.tags && record.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">标签</label>
                    <div className="flex flex-wrap gap-2">
                      {record.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 附件 */}
                {record.attachments && record.attachments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">附件</label>
                    <div className="space-y-2">
                      {record.attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Activity className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            查看
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 