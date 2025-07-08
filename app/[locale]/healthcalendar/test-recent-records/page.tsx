"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Heart, Activity, Plus, Users, Droplets, Stethoscope, Pill, Camera, FileText, RefreshCw, ArrowLeft, Utensils } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useToast } from "@/hooks/use-toast"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { usePeriodRecords } from "@/hooks/use-period-records"
import { useMealRecords } from "@/hooks/use-meal-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection, initializeGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { HealthRecord } from "@/lib/health-database"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import { generatePoopSummary } from "@/lib/poop-options"
import { getMealTypeLabel, getFoodTypeLabel, getMealPortionLabel, getMealConditionLabel } from "@/lib/meal-options"

export default function TestRecentRecordsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [refreshVersion, setRefreshVersion] = useState(0)
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser, forceRefresh: forceRefreshUsers } = useUserManagement()
  const { getAllRecords, isInitialized } = useHealthDatabase()

  // 使用全局用户选择状态
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()

  // 初始化全局用户选择状态
  useEffect(() => {
    if (availableUsers.length > 0 && selectedUsers.length === 0) {
      const primaryUser = getPrimaryUser()
      if (primaryUser) {
        console.log('[TestRecentRecordsPage] Initializing global user selection with primary user:', primaryUser)
        initializeGlobalUserSelection(primaryUser)
      }
    }
  }, [availableUsers, selectedUsers.length, getPrimaryUser])

  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
    return getPrimaryUser()
  }, [selectedUsers, getPrimaryUser])

  // Call usePoopRecords, usePeriodRecords, and useMealRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const periodRecordsApi = usePeriodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const mealRecordsApi = useMealRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
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
      datetime: r.datetime,
      type: "poop",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
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
  }, [periodRecords, currentUser, refreshVersion])

  // Map MealRecord[] to HealthRecord[] for testing
  const mappedMealRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMealRecords] mapping records, refreshVersion:', refreshVersion, 'mealRecords:', mealRecords)
    return mealRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime,
      type: "meal",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
      })) || [],
      mealType: r.mealType,
      foodTypes: r.foodTypes,
      mealPortion: r.mealPortion,
      mealCondition: r.mealCondition,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [mealRecords, currentUser, refreshVersion])

  // 获取最近记录（按创建时间排序，取最新的10条用于测试）
  const recentRecords = useMemo(() => {
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords, ...mappedMealRecords]
    const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
    const filteredRecords = allRecords.filter(record => 
      selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
    )
    
    // 按创建时间排序，取最新的10条
    const sortedRecords = filteredRecords
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
    
    console.log('[recentRecords] 最近记录计算:', {
      totalRecords: allRecords.length,
      filteredRecords: filteredRecords.length,
      recentRecords: sortedRecords.length,
      selectedUsers: selectedUserIds
    })
    
    return sortedRecords
  }, [mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, selectedUsers])

  // 获取记录类型图标和颜色
  const getRecordTypeInfo = (record: HealthRecord) => {
    switch (record.type) {
      case "period":
        return {
          icon: <Droplets className="h-4 w-4" />,
          color: "bg-red-50",
          dotColor: "bg-red-500",
          title: "生理记录"
        }
      case "poop":
        return {
          icon: <Activity className="h-4 w-4" />,
          color: "bg-yellow-50",
          dotColor: "bg-yellow-500",
          title: "排便记录"
        }
      case "health":
        return {
          icon: <Heart className="h-4 w-4" />,
          color: "bg-blue-50",
          dotColor: "bg-blue-500",
          title: "健康记录"
        }
      case "meal":
        return {
          icon: <Utensils className="h-4 w-4" />,
          color: "bg-orange-50",
          dotColor: "bg-orange-500",
          title: "用餐记录"
        }
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          color: "bg-gray-50",
          dotColor: "bg-gray-500",
          title: "其他记录"
        }
    }
  }

  // 获取记录摘要
  const getRecordSummary = (record: HealthRecord) => {
    if (record.type === "period") {
      const flowText = record.flow ? `流量${record.flow === 'light' ? '轻' : record.flow === 'medium' ? '中等' : '重'}` : ''
      const painText = record.pain ? `疼痛${record.pain === 'none' ? '无' : record.pain === 'mild' ? '轻微' : record.pain === 'moderate' ? '中等' : '严重'}` : ''
      return [flowText, painText].filter(Boolean).join(' · ') || '生理记录'
    }
    if (record.type === "poop") {
      return generatePoopSummary(record.poopType, record.poopColor, record.poopSmell)
    }
    if (record.type === "meal") {
      const mealTypeText = record.mealType ? getMealTypeLabel(record.mealType) : ''
      const portionText = record.mealPortion ? getMealPortionLabel(record.mealPortion) : ''
      const foodTypesText = record.foodTypes && record.foodTypes.length > 0 
        ? record.foodTypes.map(type => getFoodTypeLabel(type)).join('、') 
        : ''
      
      const summaryParts = [mealTypeText, foodTypesText, portionText].filter(Boolean)
      return summaryParts.length > 0 ? summaryParts.join(' · ') : '用餐记录'
    }
    return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '健康记录'
  }

  // 格式化时间显示
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    if (diffInDays > 0) {
      return `${diffInDays}天前`
    } else if (diffInHours > 0) {
      return `${diffInHours}小时前`
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  // 处理查看记录
  const handleViewRecord = (record: HealthRecord) => {
    console.log('[handleViewRecord] 点击记录:', record)
    if (record.type === "period") {
      router.push("/healthcalendar/period" as any)
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "poop") {
      router.push("/healthcalendar/poop" as any)
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "meal") {
      router.push("/healthcalendar/meal" as any)
      localStorage.setItem('editRecordId', record.id)
    } else {
      router.push(`/healthcalendar/view/${record.date}` as any)
    }
  }

  // 手动触发云同步
  const handleCloudSync = async () => {
    if (!currentUser?.uniqueOwnerId) return
    try {
      console.log('[handleCloudSync] 手动强制云端同步触发. currentUser:', currentUser)
      
      const [userRefreshResult, poopRecordsRefreshResult, periodRecordsRefreshResult, mealRecordsRefreshResult] = await Promise.allSettled([
        forceRefreshUsers(),
        poopRecordsApi.syncFromCloud(),
        periodRecordsApi.syncFromCloud(),
        mealRecordsApi.syncFromCloud()
      ])
      
      console.log('[handleCloudSync] 同步结果:', {
        users: userRefreshResult.status,
        poop: poopRecordsRefreshResult.status,
        period: periodRecordsRefreshResult.status,
        meal: mealRecordsRefreshResult.status
      })
      
      setRefreshVersion(v => v + 1)
      
      toast({
        title: "同步完成",
        description: "数据已从云端同步",
      })
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
      toast({
        title: "同步失败",
        description: "无法从云端同步数据",
        variant: "destructive",
      })
    }
  }

  const handleUserSelectionChange = (users: UserProfile[]) => {
    console.log('[TestRecentRecordsPage] handleUserSelectionChange called with:', users)
    updateSelectedUsers(users)
  }

  const handleBack = () => {
    router.push("/healthcalendar")
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
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">最近记录测试</h1>
            <p className="text-sm text-gray-600">测试最近记录功能</p>
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
              onChange={user => handleUserSelectionChange([user])}
            />
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="text-lg">调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>当前用户: {currentUser?.nickname || '未选择'}</p>
            <p>用户ID: {currentUser?.uniqueOwnerId || '未选择'}</p>
            <p>排便记录数量: {mappedPoopRecords.length}</p>
            <p>生理记录数量: {mappedPeriodRecords.length}</p>
            <p>最近记录数量: {recentRecords.length}</p>
            <p>数据库初始化状态: {isInitialized ? '已初始化' : '未初始化'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">最近记录 (测试版)</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                共 {recentRecords.length} 条记录
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloudSync}
                className="p-1 h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暂无记录</p>
              <p className="text-sm text-gray-500">开始记录您的健康数据吧</p>
            </div>
          ) : (
            <div className="space-y-3">
                              {recentRecords.map((record, index) => {
                  const typeInfo = getRecordTypeInfo(record)
                  const summary = getRecordSummary(record)
                  const timeAgo = formatTimeAgo(record.createdAt)
                  
                  return (
                    <div 
                      key={record.id}
                      className={`flex items-center justify-between p-3 ${typeInfo.color} rounded-lg cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => handleViewRecord(record)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${typeInfo.dotColor} rounded-full`}></div>
                        <div className="flex items-center space-x-2">
                          {typeInfo.icon}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {typeInfo.title} #{index + 1}
                              </p>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {record.ownerName || '未知用户'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{timeAgo} · {summary}</p>
                            <p className="text-xs text-gray-500">ID: {record.id}</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        查看
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 