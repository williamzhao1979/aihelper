"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Heart, Activity, Users, Clock, Tag, X } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { usePeriodRecords } from "@/hooks/use-period-records"
import { useMealRecords } from "@/hooks/use-meal-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { HealthRecord } from "@/lib/health-database"
import { formatDisplayDateTime, formatDisplayDate } from "@/lib/utils"
import { getMealTypeLabel, getFoodTypeLabel, getMealPortionLabel, getMealConditionLabel } from "@/lib/meal-options"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import dayjs from 'dayjs'

export default function ViewPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<HealthRecord | null>(null)
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null) // 图片放大模态框
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()
  
  // 使用全局用户选择状态
  const { selectedUsers } = useGlobalUserSelection()

  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
    return getPrimaryUser()
  }, [selectedUsers, getPrimaryUser])

  // Call usePoopRecords, usePeriodRecords, and useMealRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const periodRecordsApi = usePeriodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const mealRecordsApi = useMealRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  console.log("[ViewPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)
  console.log("[ViewPage] selectedUsers:", selectedUsers)
  // console.log("[ViewPage] globalSelectedUsers:", globalSelectedUsers)
  const { records: poopRecords } = poopRecordsApi
  const { records: periodRecords } = periodRecordsApi
  const { records: mealRecords } = mealRecordsApi

  // Map PoopRecord[] to HealthRecord[] for calendar/stats
  const mappedPoopRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedPoopRecords] mapping records, refreshVersion:', refreshVersion, 'poopRecords:', poopRecords)
    return poopRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "poop",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      poopType: r.poopType,
      poopColor: r.poopColor,
      poopSmell: r.poopSmell,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [poopRecords, currentUser, refreshVersion])

  // Map PeriodRecord[] to HealthRecord[] for calendar/stats
  const mappedPeriodRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedPeriodRecords] mapping records, refreshVersion:', refreshVersion, 'periodRecords:', periodRecords)
    return periodRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "period",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      flow: r.flow,
      pain: r.pain,
      mood: r.mood,
      symptoms: r.symptoms,
      notes: r.notes,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [periodRecords, currentUser, refreshVersion])

  // Map MealRecord[] to HealthRecord[] for calendar/stats
  const mappedMealRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMealRecords] mapping records, refreshVersion:', refreshVersion, 'mealRecords:', mealRecords)
    return mealRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "meal",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      mealType: r.mealType,
      foodTypes: r.foodTypes,
      mealPortion: r.mealPortion,
      mealCondition: r.mealCondition,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [mealRecords, currentUser, refreshVersion])

  // Sync from cloud on mount and when currentUser changes - 强制获取最新数据
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] 强制云端同步触发. currentUser:', currentUser)
    console.log('[useEffect] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length)
    
    const doSync = async () => {
      try {
        console.log('[useEffect] 开始强制云端同步，用户:', currentUser?.uniqueOwnerId)
        await Promise.all([
          poopRecordsApi.syncFromCloud(),
          periodRecordsApi.syncFromCloud(),
          mealRecordsApi.syncFromCloud()
        ])
        console.log('[useEffect] 强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length)
      } catch (err) {
        console.error('[useEffect] 强制云端同步失败:', err)
      }
    }
    doSync()
  }, [currentUser?.uniqueOwnerId])

  const date = params.date as string
  const formattedDate = dayjs(date).format('YYYY年MM月DD日')
  const dayOfWeek = dayjs(date).format('dddd')

  // 获取指定日期的记录
  const dayRecords = useMemo(() => {
    console.log('[dayRecords] Filtering records for date:', date)
    console.log('[dayRecords] Available records:', mappedPoopRecords.length, 'periodRecords:', mappedPeriodRecords.length, 'mealRecords:', mappedMealRecords.length)
    console.log('[dayRecords] Current user:', currentUser)
    
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords, ...mappedMealRecords]
    
    const filtered = allRecords.filter(record => {
      const recordDate = dayjs(record.date).format('YYYY-MM-DD')
      const matchesDate = recordDate === date
      const matchesUser = record.ownerId === currentUser?.uniqueOwnerId || 
                         record.uniqueOwnerId === currentUser?.uniqueOwnerId
      
      console.log(`[dayRecords] Record ${record.id}: date=${recordDate}, user=${record.ownerId}, matchesDate=${matchesDate}, matchesUser=${matchesUser}`)
      
      return matchesDate && matchesUser
    })
    
    console.log('[dayRecords] Filtered records:', filtered.length)
    return filtered
  }, [mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, date, currentUser])

  const handleBack = () => {
    router.push("/healthcalendar")
  }

  const handleAddRecord = () => {
    setIsRecordSelectorOpen(true)
  }

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[ViewPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // 手动触发云同步，带详细调试日志 - 强制获取最新数据
  const handleCloudSync = useCallback(async () => {
    if (!currentUser?.uniqueOwnerId) return
    setIsSyncing(true)
    try {
      console.log('[handleCloudSync] 手动强制云端同步触发. currentUser:', currentUser)
      console.log('[handleCloudSync] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length)
      await Promise.all([
        poopRecordsApi.syncFromCloud(),
        periodRecordsApi.syncFromCloud(),
        mealRecordsApi.syncFromCloud()
      ])
      console.log('[handleCloudSync] 手动强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length)
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi, periodRecordsApi, mealRecordsApi])

  // Poop类型映射
  const getPoopTypeLabel = (type: string) => {
    const typeMap = {
      type1: "类型1 - 分离的硬块",
      type2: "类型2 - 香蕉状但结块",
      type3: "类型3 - 香蕉状有裂缝",
      type4: "类型4 - 香蕉状光滑",
      type5: "类型5 - 软块边缘清晰",
      type6: "类型6 - 糊状边缘模糊",
      type7: "类型7 - 完全液体"
    }
    return typeMap[type as keyof typeof typeMap] || type
  }
  const getPoopColorLabel = (color: string) => {
    const colorMap = {
      brown: "棕色",
      dark_brown: "深棕色",
      light_brown: "浅棕色",
      yellow: "黄色",
      green: "绿色",
      black: "黑色",
      red: "红色",
      white: "白色"
    }
    return colorMap[color as keyof typeof colorMap] || color
  }
  const getPoopSmellLabel = (smell: string) => {
    const smellMap = {
      normal: "正常",
      strong: "强烈",
      foul: "恶臭",
      sweet: "甜味",
      metallic: "金属味"
    }
    return smellMap[smell as keyof typeof smellMap] || smell
  }

  // Period类型映射
  const getPeriodFlowLabel = (flow: string) => {
    const flowMap = {
      light: "轻量",
      medium: "中等",
      heavy: "大量"
    }
    return flowMap[flow as keyof typeof flowMap] || flow
  }

  const getPeriodPainLabel = (pain: string) => {
    const painMap = {
      none: "无疼痛",
      mild: "轻微疼痛",
      moderate: "中等疼痛",
      severe: "严重疼痛"
    }
    return painMap[pain as keyof typeof painMap] || pain
  }

  const getPeriodMoodLabel = (mood: string) => {
    const moodMap = {
      good: "心情好",
      normal: "一般",
      bad: "心情差"
    }
    return moodMap[mood as keyof typeof moodMap] || mood
  }

  const handleEditRecord = (record: HealthRecord) => {
    // 跳转到编辑页面，便便类型跳转到/poop，生理到/period，饮食到/meal，其他到/record
    if (record.type === "poop") {
      router.push(`/healthcalendar/poop?date=${record.date}&edit=${record.id}` as any)
    } else if (record.type === "period") {
      router.push(`/healthcalendar/period?date=${record.date}&edit=${record.id}` as any)
    } else if (record.type === "meal") {
      router.push(`/healthcalendar/meal?date=${record.date}&edit=${record.id}` as any)
    } else {
      router.push(`/healthcalendar/record?date=${record.date}&edit=${record.id}` as any)
    }
  }
  const handleDeleteClick = (record: HealthRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;

    const recordId = recordToDelete.id;
    setDeletingRecordId(recordId);
    setDeleteDialogOpen(false);

    try {
      // 根据记录类型调用相应的删除API
      if (poopRecordsApi.records.find(r => r.id === recordId)) {
        // 删除便便记录
        await poopRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "便便记录已删除并同步到云端",
        });
      } else if (periodRecordsApi.records.find(r => r.id === recordId)) {
        // 删除生理记录
        await periodRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "生理记录已删除并同步到云端",
        });
      } else if (mealRecordsApi.records.find(r => r.id === recordId)) {
        // 删除饮食记录
        await mealRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "饮食记录已删除并同步到云端",
        });
      } else {
        toast({
          title: "删除失败",
          description: "未找到要删除的记录",
          variant: "destructive",
        });
        return;
      }

      // 强制刷新数据以确保UI更新
      setRefreshVersion(v => v + 1);
      
    } catch (error) {
      console.error('[handleDeleteConfirm] 删除记录失败:', error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除记录时发生错误",
        variant: "destructive",
      });
    } finally {
      setDeletingRecordId(null);
      setRecordToDelete(null);
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  }

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载用户数据中...</p>
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
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </Button>
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{formattedDate}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleAddRecord}
              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              <span>添加记录</span>
            </Button>
          </div>
        </div>
      </div>

      {/* User Selector */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
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

      {/* Records */}
      <div className="space-y-4">
        {dayRecords.length === 0 ? (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
              <p className="text-gray-600 mb-4">这一天还没有健康记录</p>
              <Button onClick={handleAddRecord} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                添加记录
              </Button>
            </CardContent>
          </Card>
        ) : (
          dayRecords.map((record) => (
            <Card key={record.id} className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      record.type === 'period' ? 'bg-red-500' : 
                      record.type === 'poop' ? 'bg-yellow-500' : 
                      record.type === 'meal' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span>{
                      record.type === 'period' ? '生理记录' : 
                      record.type === 'poop' ? '排便记录' : 
                      record.type === 'meal' ? '用餐记录' :
                      '健康记录'
                    }</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {dayjs(record.datetime || record.createdAt).format('HH:mm')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClick(record)} 
                      className="text-red-600 hover:text-red-700"
                      disabled={deletingRecordId === record.id}
                    >
                      {deletingRecordId === record.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {record.content && (
                  <p className="text-gray-700 mb-3">{record.content}</p>
                )}
                
                {/* Tags */}
                {record.tags && record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {record.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{tag}</span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Poop specific details */}
                {record.type === 'poop' && (
                  <div className="space-y-2">
                    {record.poopType && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">类型:</span>
                        <Badge variant="outline">{getPoopTypeLabel(record.poopType)}</Badge>
                      </div>
                    )}
                    {record.poopColor && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">颜色:</span>
                        <Badge variant="outline">{getPoopColorLabel(record.poopColor)}</Badge>
                      </div>
                    )}
                    {record.poopSmell && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">气味:</span>
                        <Badge variant="outline">{getPoopSmellLabel(record.poopSmell)}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Period specific details */}
                {record.type === 'period' && (
                  <div className="space-y-2">
                    {record.flow && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">流量:</span>
                        <Badge variant="outline">{getPeriodFlowLabel(record.flow)}</Badge>
                      </div>
                    )}
                    {record.pain && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">疼痛:</span>
                        <Badge variant="outline">{getPeriodPainLabel(record.pain)}</Badge>
                      </div>
                    )}
                    {record.mood && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">心情:</span>
                        <Badge variant="outline">{getPeriodMoodLabel(record.mood)}</Badge>
                      </div>
                    )}
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">症状:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.symptoms.map((symptom, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meal specific details */}
                {record.type === 'meal' && (
                  <div className="space-y-2">
                    {record.mealType && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">餐次:</span>
                        <Badge variant="outline">{getMealTypeLabel(record.mealType)}</Badge>
                      </div>
                    )}
                    {record.foodTypes && record.foodTypes.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">食物类型:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.foodTypes.map((foodType, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {getFoodTypeLabel(foodType)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {record.mealPortion && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">进食量:</span>
                        <Badge variant="outline">{getMealPortionLabel(record.mealPortion)}</Badge>
                      </div>
                    )}
                    {record.mealCondition && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">进食情况:</span>
                        <Badge variant="outline">{getMealConditionLabel(record.mealCondition)}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {record.attachments && record.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">附件:</h4>
                    
                    {/* 图片预览网格 */}
                    {record.attachments.filter(a => a.type.startsWith('image/') && a.url).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                        {record.attachments
                          .filter(a => a.type.startsWith('image/') && a.url)
                          .map(attachment => (
                            <div key={attachment.id} className="relative group">
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer">
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                  onClick={() => attachment.url && setImageModalUrl(attachment.url)}
                                />
                              </div>
                              {/* 文件名 */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                                {attachment.name}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {/* 非图片附件列表 */}
                    {record.attachments.filter(a => !a.type.startsWith('image/')).length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {record.attachments
                          .filter(a => !a.type.startsWith('image/'))
                          .map(attachment => (
                            <div key={attachment.id} className="p-2 border rounded-lg">
                              <p className="text-sm font-medium">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.type}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Record Type Selector */}
      {isRecordSelectorOpen && (
        <RecordTypeSelector
          isOpen={isRecordSelectorOpen}
          onClose={() => {
            console.log("ViewPage - onClose called, setting isRecordSelectorOpen to false")
            setIsRecordSelectorOpen(false)
          }}
          date={date}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条{recordToDelete?.type === 'poop' ? '便便' : recordToDelete?.type === 'period' ? '生理' : '健康'}记录吗？
              <br />
              <span className="text-red-600 font-medium">此操作无法撤销。</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingRecordId === recordToDelete?.id}
            >
              {deletingRecordId === recordToDelete?.id ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>删除中...</span>
                </div>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 图片放大模态框 */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center p-4">
            <img
              src={imageModalUrl}
              alt="放大图片"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 hover:bg-opacity-75"
              onClick={() => setImageModalUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}