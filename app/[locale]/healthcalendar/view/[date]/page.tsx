"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Heart, Activity } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { HealthRecord } from "@/lib/health-database"
import { formatDisplayDateTime, formatDisplayDate } from "@/lib/utils"

interface PageProps {
  params: Promise<{ date: string }>
}

export default function HealthRecordViewPage({ params }: PageProps) {
  const router = useRouter()
  const { getRecordsByDate, deleteRecord, isInitialized, isLoading } = useHealthDatabase()
  const [date, setDate] = useState<string>("")
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { date: dateParam } = await params
      setDate(dateParam)
      
      if (isInitialized) {
        try {
          const dayRecords = await getRecordsByDate(dateParam)
          setRecords(dayRecords)
        } catch (error) {
          console.error("Failed to load records:", error)
        } finally {
          setIsLoadingData(false)
        }
      }
    }
    
    if (isInitialized && !isLoading) {
      loadData()
    }
  }, [params, isInitialized, isLoading, getRecordsByDate])

  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString)
  }

  const getTypeLabel = (type: string) => {
    const typeMap = {
      period: "例假记录",
      health: "健康记录",
      poop: "便便记录"
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const getTypeColor = (type: string) => {
    const colorMap = {
      period: "bg-red-100 text-red-800",
      health: "bg-blue-100 text-blue-800",
      poop: "bg-amber-100 text-amber-800"
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
    const moodMap: Record<string, string> = {
      "happy": "开心",
      "normal": "一般",
      "sad": "难过",
      "irritable": "烦躁",
      "anxious": "焦虑",
      "tired": "疲惫",
      "energetic": "精力充沛"
    }
    return moodMap[mood] || mood
  }

  // 便便类型转换函数
  const getPoopTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      "type1": "类型1 - 分离的硬块",
      "type2": "类型2 - 香肠状但结块",
      "type3": "类型3 - 香肠状但表面有裂缝",
      "type4": "类型4 - 香肠状或蛇状，光滑柔软",
      "type5": "类型5 - 软块，边缘清晰",
      "type6": "类型6 - 糊状，边缘不清晰",
      "type7": "类型7 - 完全液体",
      "other": "其他类型"
    }
    return typeMap[type] || type
  }

  // 便便颜色转换函数
  const getPoopColorLabel = (color: string) => {
    const colorMap: Record<string, string> = {
      "brown": "棕色",
      "light_yellow": "浅黄或灰白",
      "black": "黑色",
      "red": "红色",
      "green": "绿色",
      "yellow_foamy": "黄色泡沫状",
      "other": "其他颜色"
    }
    return colorMap[color] || color
  }

  // 便便气味转换函数
  const getPoopSmellLabel = (smell: string) => {
    const smellMap: Record<string, string> = {
      "normal": "正常气味",
      "foul": "恶臭",
      "oily_floating": "油脂光泽、漂浮",
      "mucus": "粘液",
      "blood": "带血",
      "parasites": "含寄生虫/虫卵",
      "other": "其他特征"
    }
    return smellMap[smell] || smell
  }

  const handleAddRecord = () => {
    router.push("/healthcalendar/record")
  }

  const handleEditRecord = (record: HealthRecord) => {
    // 根据记录类型跳转到对应的编辑页面
    switch (record.type) {
      case "poop":
        // 便便记录编辑 - 跳转到便便记录页面并传递记录ID
        router.push(`/healthcalendar/poop?edit=${record.id}` as any)
        break
      case "period":
        // 例假记录编辑 - 跳转到例假记录页面并传递记录ID
        router.push(`/healthcalendar/period?edit=${record.id}` as any)
        break
      case "health":
      default:
        // 一般健康记录编辑 - 跳转到健康记录页面并传递记录ID
        router.push(`/healthcalendar/record?edit=${record.id}` as any)
        break
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm("确定要删除这条记录吗？")) {
      try {
        await deleteRecord(recordId)
        // Refresh records after deletion
        const dayRecords = await getRecordsByDate(date)
        setRecords(dayRecords)
      } catch (error) {
        console.error("Failed to delete record:", error)
      }
    }
  }

  if (isLoading || isLoadingData) {
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
                      {record.datetime ? 
                        formatDisplayDateTime(record.datetime) :
                        formatDisplayDateTime(record.createdAt.toISOString())
                      }
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRecord(record)}
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

                {/* 便便记录特殊字段 */}
                {record.type === "poop" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">便便类型</label>
                      <p className="text-sm text-gray-900">
                        {record.poopType ? getPoopTypeLabel(record.poopType) : "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">颜色</label>
                      <p className="text-sm text-gray-900">
                        {record.poopColor ? getPoopColorLabel(record.poopColor) : "未设置"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">气味</label>
                      <p className="text-sm text-gray-900">
                        {record.poopSmell ? getPoopSmellLabel(record.poopSmell) : "未设置"}
                      </p>
                    </div>
                    {record.notes && (
                      <div className="md:col-span-3">
                        <label className="text-sm font-medium text-gray-700">备注</label>
                        <p className="text-sm text-gray-900 mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                )}

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