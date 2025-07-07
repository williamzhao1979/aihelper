"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Activity, Heart, Smile, Frown, Meh, Users } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import { useUserManagement } from "@/hooks/use-user-management"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateString, getLocalDateTimeString } from "@/lib/utils"
import { usePeriodRecords } from '@/hooks/use-period-records'
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

export default function PeriodRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { getPrimaryUser, users: availableUsers } = useUserManagement()
  
  // 使用全局用户选择状态
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()
  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
  }, [selectedUsers])

  const selectedUser = currentUser

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false)
  const [editRecordId, setEditRecordId] = useState<string>("")
  const [isLoadingRecord, setIsLoadingRecord] = useState(false)

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[PeriodPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // 初始化云端存储hook
  const periodRecordsApi = usePeriodRecords(
    selectedUser?.uniqueOwnerId || "",
    selectedUser?.uniqueOwnerId || ""
  )
  const { records: periodRecords } = periodRecordsApi

  // 映射PeriodRecord[]到HealthRecord[]格式
  const mappedPeriodRecords = useMemo(() => {
    console.log('[mappedPeriodRecords] mapping records, periodRecords:', periodRecords)
    return periodRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: selectedUser?.uniqueOwnerId || "",
      ownerId: selectedUser?.uniqueOwnerId || "",
      ownerName: selectedUser?.nickname || "",
      date: r.date,
      datetime: r.datetime,
      type: "period",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
      })) || [],
      flow: r.flow,
      pain: r.pain,
      mood: r.mood,
      symptoms: r.symptoms,
      notes: r.notes,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [periodRecords, selectedUser])
  
  const [recordDateTime, setRecordDateTime] = useState<string>(() => {
    // 检查URL参数中的日期和时间
    const dateParam = searchParams.get('date')
    const timeParam = searchParams.get('time')
    
    if (dateParam && timeParam) {
      // 如果有日期和时间参数，组合使用
      return `${dateParam}T${timeParam}`
    } else if (dateParam) {
      // 如果只有日期参数，使用当前时间
      const currentTime = new Date().toTimeString().slice(0, 5)
      return `${dateParam}T${currentTime}`
    } else {
      // 默认使用当前日期时间
      return getLocalDateTimeString()
    }
  })
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

  // 强制获取最新数据 - 每次进入period页面时都强制刷新云端数据（与poop页面保持一致）
  useEffect(() => {
    if (!selectedUser?.uniqueOwnerId) return
    console.log('[useEffect] Period页面强制云端刷新触发. selectedUser:', selectedUser)
    
    const doForceRefresh = async () => {
      try {
        console.log('[useEffect] Period页面开始强制云端刷新，用户:', selectedUser?.uniqueOwnerId)
        // 使用forceRefresh确保清除所有缓存并获取最新数据
        await periodRecordsApi.forceRefresh()
        console.log('[useEffect] Period页面强制云端刷新完成')
      } catch (err) {
        console.error('[useEffect] Period页面强制云端刷新失败，尝试syncFromCloud:', err)
        try {
          await periodRecordsApi.syncFromCloud()
          console.log('[useEffect] Period页面syncFromCloud完成')
        } catch (syncErr) {
          console.error('[useEffect] Period页面syncFromCloud也失败:', syncErr)
        }
      }
    }
    doForceRefresh()
  }, [selectedUser?.uniqueOwnerId])

  // 检查是否为编辑模式 - 支持URL参数和localStorage
  useEffect(() => {
    const editId = searchParams.get('edit') || localStorage.getItem('editRecordId')
    console.log("URL参数edit:", searchParams.get('edit')) // 调试日志
    console.log("localStorage editRecordId:", localStorage.getItem('editRecordId')) // 调试日志
    console.log("最终使用的editId:", editId) // 调试日志
    console.log("selectedUser?.uniqueOwnerId:", selectedUser?.uniqueOwnerId)
    
    if (editId) {
      setIsEditMode(true)
      setEditRecordId(editId)
      console.log("设置为编辑模式，记录ID:", editId) // 调试日志
      // 清除localStorage中的编辑记录ID
      localStorage.removeItem('editRecordId')
      
      // 使用与poop页面相同的数据加载逻辑
      const loadRecordFromMappedData = async () => {
        console.log("开始从mappedPeriodRecords中查找记录:", editId)
        console.log("当前mappedPeriodRecords数量:", mappedPeriodRecords.length)
        
        // 从mappedPeriodRecords中查找记录
        const record = mappedPeriodRecords.find(r => r.id === editId || r.recordId === editId)
        
        if (record && record.type === "period") {
          console.log("从mappedPeriodRecords找到记录:", record)
          await loadRecordForEdit(editId)
        } else {
          console.log("在mappedPeriodRecords中未找到记录，等待数据加载...")
          // 如果当前没有找到记录，可能是数据还在加载中，等待一下再试
          setTimeout(() => {
            const retryRecord = mappedPeriodRecords.find(r => r.id === editId || r.recordId === editId)
            if (retryRecord && retryRecord.type === "period") {
              console.log("重试找到记录:", retryRecord)
              loadRecordForEdit(editId)
            } else {
              console.log("重试后仍未找到记录")
              toast({
                title: "记录不存在",
                description: `要编辑的记录 (${editId}) 不存在或类型不匹配。`,
                variant: "destructive",
              })
            }
          }, 1000)
        }
      }
      
      // 延迟执行，确保组件完全初始化
      setTimeout(() => {
        loadRecordFromMappedData()
      }, 100)
    } else {
      console.log("新建模式") // 调试日志
    }
  }, [searchParams, mappedPeriodRecords]) // 使用mappedPeriodRecords作为依赖项

  // 加载记录用于编辑
  const loadRecordForEdit = async (recordId: string) => {
    console.log("开始加载记录:", recordId) // 调试日志
    console.log("当前用户:", selectedUser)
    console.log("mappedPeriodRecords数量:", mappedPeriodRecords.length)
    setIsLoadingRecord(true) // 使用专门的记录加载状态
    
    try {
      // 从mappedPeriodRecords中查找记录
      console.log("从mappedPeriodRecords中查找:", recordId)
      console.log("当前mappedPeriodRecords:", mappedPeriodRecords)
      
      let record = mappedPeriodRecords.find(r => r.id === recordId || r.recordId === recordId)
      
      if (record && record.type === "period") {
        console.log("记录类型正确，开始设置表单值") // 调试日志
        
        // 使用实际记录的值，只有在值为undefined或null时才使用默认值
        // 优先使用datetime字段，如果没有则使用createdAt
        let newDateTime: string
        if (record.datetime) {
          // 优先使用datetime字段
          const recordDate = new Date(record.datetime)
          newDateTime = getLocalDateTimeString(recordDate)
        } else if (record.createdAt) {
          // 如果没有datetime字段，则使用createdAt
          let recordDate: Date
          if (typeof record.createdAt === 'string') {
            // 云端记录：createdAt是ISO字符串
            recordDate = new Date(record.createdAt)
          } else {
            // 数据库记录：createdAt是Date对象
            recordDate = record.createdAt
          }
          newDateTime = getLocalDateTimeString(recordDate)
        } else {
          newDateTime = getLocalDateTimeString()
        }
        
        const newFlow = record.flow || ""
        const newPain = record.pain || ""
        const newMood = record.mood || ""
        const newSymptoms = record.symptoms || []
        const newNotes = record.content || ""
        
        console.log("准备设置的值:", {
          recordDatetime: record.datetime,
          recordCreatedAt: record.createdAt,
          recordCreatedAtType: typeof record.createdAt,
          newDateTime: newDateTime,
          flow: newFlow,
          pain: newPain,
          mood: newMood,
          symptoms: newSymptoms,
          notes: newNotes
        }) // 调试日志
        
        setRecordDateTime(newDateTime)
        setFlow(newFlow)
        setPain(newPain)
        setMood(newMood)
        setSymptoms(newSymptoms)
        setNotes(newNotes)
        
        // 设置用户选择 - 只在当前用户不匹配时才设置
        if (record.uniqueOwnerId) {
          const recordUser = availableUsers.find(user => user.uniqueOwnerId === record.uniqueOwnerId)
          if (recordUser && (!selectedUser || selectedUser.uniqueOwnerId !== recordUser.uniqueOwnerId)) {
            console.log("设置用户选择:", recordUser)
            updateSelectedUsers([recordUser]) // 同步全局用户选择
          }
        }
        
        console.log("表单值设置完成") // 调试日志
      } else {
        console.log("记录不存在或类型不匹配:", record) // 调试日志
        console.log("mappedPeriodRecords ID列表:", mappedPeriodRecords.map(r => r.id))
        console.log("查找的记录ID:", recordId)
        
        // 不要立即跳转，而是显示错误信息
        toast({
          title: "记录不存在",
          description: `要编辑的记录 (${recordId}) 不存在或类型不匹配。请检查记录ID是否正确。`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("加载记录失败:", error)
      toast({
        title: "加载失败",
        description: "加载记录时发生错误",
        variant: "destructive",
      })
      
      // 延迟跳转，让用户看到错误信息
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 3000)
    } finally {
      setIsLoadingRecord(false) // 使用专门的记录加载状态
      console.log("加载完成") // 调试日志
    }
  }

  const handleSymptomToggle = (symptom: string) => {
    if (symptoms.includes(symptom)) {
      setSymptoms(symptoms.filter(s => s !== symptom))
    } else {
      setSymptoms([...symptoms, symptom])
    }
  }

  if (isLoadingRecord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载记录中...</p>
        </div>
      </div>
    )
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
      // 构造 PeriodRecord
      const newRecord = {
        id: isEditMode ? editRecordId : Math.random().toString(36).substr(2, 9),
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: new Date(recordDateTime).toISOString(),
        type: 'period' as const,
        content: notes.trim(),
        attachments: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        flow,
        pain,
        mood,
        symptoms,
        notes: notes.trim(),
      }

      console.log('[Period] newRecord:', newRecord)
      
      if (periodRecordsApi) {
        if (isEditMode) {
          console.log('[Period] 调用 updateRecord', newRecord)
          await periodRecordsApi.updateRecord(newRecord)
        } else {
          console.log('[Period] 调用 addRecord', newRecord)
          await periodRecordsApi.addRecord(newRecord)
        }
      }
      
      console.log("生理记录保存成功")
      toast({
        title: "保存成功",
        description: `已为 ${selectedUser.nickname} ${isEditMode ? '更新' : '保存'}生理记录（含云端同步）`,
      })
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 1000)
      
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: periodRecordsApi?.error || '保存记录时发生错误，请重试',
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
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "编辑生理记录" : "生理记录"}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? "修改生理记录信息" : "记录今天的生理状况"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 用户选择器 - 内联在页面头部 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">当前用户:</span>
              </div>
              <SingleUserSelector
                users={availableUsers}
                selectedUser={selectedUsers[0] || availableUsers[0]}
                onChange={handleUserSelectionChange}
              />
            </div>
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

        {/* 流量强度 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>流量强度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {flowOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFlow(option.value)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    flow === option.value
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                  </div>
                </button>
              ))}
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